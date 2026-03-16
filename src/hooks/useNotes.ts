import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Note, Folder } from '@/types/notes';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [foldersRes, notesRes] = await Promise.all([
          supabase.from('folders').select('*').order('created_at', { ascending: true }),
          supabase.from('notes').select('*').order('created_at', { ascending: true }),
        ]);
        if (foldersRes.error) throw foldersRes.error;
        if (notesRes.error) throw notesRes.error;

        setFolders(foldersRes.data.map(f => ({
          id: f.id,
          name: f.name,
          parentId: f.parent_id,
          createdAt: new Date(f.created_at).getTime(),
        })));
        setNotes(notesRes.data.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          folderId: n.folder_id,
          pinned: (n as any).pinned ?? false,
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at).getTime(),
        })));
      } catch (e) {
        console.error('Failed to load data:', e);
        toast.error('Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId) ?? null;

  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    const { data, error } = await supabase.from('folders').insert({ name, parent_id: parentId }).select().single();
    if (error) { toast.error('Failed to create folder'); return; }
    const folder: Folder = { id: data.id, name: data.name, parentId: data.parent_id, createdAt: new Date(data.created_at).getTime() };
    setFolders(prev => [...prev, folder]);
    return folder;
  }, []);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('folders').update({ name }).eq('id', id);
    if (error) { toast.error('Failed to rename folder'); return; }
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  }, []);

  const getDescendantFolderIds = useCallback((folderId: string, allFolders: Folder[]): string[] => {
    const children = allFolders.filter(f => f.parentId === folderId);
    return children.flatMap(c => [c.id, ...getDescendantFolderIds(c.id, allFolders)]);
  }, []);

  const deleteFolderAndContents = useCallback(async (id: string) => {
    const descendantIds = getDescendantFolderIds(id, folders);
    const allFolderIds = [id, ...descendantIds];

    for (const fid of allFolderIds) {
      await supabase.from('notes').delete().eq('folder_id', fid);
    }
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete folder'); return; }

    setNotes(prev => prev.filter(n => !allFolderIds.includes(n.folderId ?? '')));
    setFolders(prev => prev.filter(f => !allFolderIds.includes(f.id)));
  }, [folders, getDescendantFolderIds]);

  const deleteFolderKeepNotes = useCallback(async (id: string, noteIdsToKeep: string[]) => {
    const descendantIds = getDescendantFolderIds(id, folders);
    const allFolderIds = [id, ...descendantIds];

    let toSortFolder = folders.find(f => f.name === 'To Sort' && f.parentId === null);
    if (!toSortFolder) {
      const { data, error } = await supabase.from('folders').insert({ name: 'To Sort' }).select().single();
      if (error) { toast.error('Failed to create To Sort folder'); return; }
      toSortFolder = { id: data.id, name: data.name, parentId: data.parent_id, createdAt: new Date(data.created_at).getTime() };
      setFolders(prev => [...prev, toSortFolder!]);
    }

    if (noteIdsToKeep.length > 0) {
      for (const noteId of noteIdsToKeep) {
        await supabase.from('notes').update({ folder_id: toSortFolder.id }).eq('id', noteId);
      }
    }

    const allNotesInFolders = notes.filter(n => allFolderIds.includes(n.folderId ?? ''));
    const noteIdsToDelete = allNotesInFolders.filter(n => !noteIdsToKeep.includes(n.id)).map(n => n.id);
    for (const noteId of noteIdsToDelete) {
      await supabase.from('notes').delete().eq('id', noteId);
    }

    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete folder'); return; }

    setNotes(prev => prev
      .filter(n => !noteIdsToDelete.includes(n.id))
      .map(n => noteIdsToKeep.includes(n.id) ? { ...n, folderId: toSortFolder!.id } : n)
    );
    setFolders(prev => prev.filter(f => !allFolderIds.includes(f.id)));
  }, [folders, notes, getDescendantFolderIds]);

  const moveFolderToParent = useCallback(async (folderId: string, parentId: string | null) => {
    if (parentId) {
      const descendantIds = getDescendantFolderIds(folderId, folders);
      if (parentId === folderId || descendantIds.includes(parentId)) {
        toast.error("Can't move a folder into itself");
        return;
      }
    }
    const { error } = await supabase.from('folders').update({ parent_id: parentId }).eq('id', folderId);
    if (error) { toast.error('Failed to move folder'); return; }
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, parentId } : f));
  }, [folders, getDescendantFolderIds]);

  const createNote = useCallback(async (folderId: string | null = null) => {
    const { data, error } = await supabase.from('notes').insert({
      title: '',
      content: '',
      folder_id: folderId,
    }).select().single();
    if (error) { toast.error('Failed to create note'); return; }
    const note: Note = {
      id: data.id,
      title: data.title,
      content: data.content,
      folderId: data.folder_id,
      pinned: false,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
    setNotes(prev => [...prev, note]);
    setActiveNoteId(note.id);
    return note;
  }, []);

  const createNoteWithContent = useCallback(async (title: string, content: string, folderId: string | null = null) => {
    const { data, error } = await supabase.from('notes').insert({
      title,
      content,
      folder_id: folderId,
    }).select().single();
    if (error) { toast.error('Failed to create note'); return; }
    const note: Note = {
      id: data.id,
      title: data.title,
      content: data.content,
      folderId: data.folder_id,
      pinned: false,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
    setNotes(prev => [...prev, note]);
    setActiveNoteId(note.id);
    return note;
  }, []);

  // Update note: immediately updates local state, debounces DB write
  const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'folderId' | 'pinned'>>) => {
    // Update local state immediately
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));

    // Debounce DB write
    const timerKey = id;
    const existing = debounceTimers.current.get(timerKey);
    if (existing) clearTimeout(existing);

    debounceTimers.current.set(timerKey, setTimeout(async () => {
      debounceTimers.current.delete(timerKey);
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
      if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;

      const { error } = await supabase.from('notes').update(dbUpdates).eq('id', id);
      if (error) console.error('Failed to save note:', error);
    }, 500));
  }, []);

  const togglePin = useCallback((id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    updateNote(id, { pinned: !note.pinned });
  }, [notes, updateNote]);

  const deleteNote = useCallback(async (id: string) => {
    // Clear any pending debounce for this note
    const timer = debounceTimers.current.get(id);
    if (timer) { clearTimeout(timer); debounceTimers.current.delete(id); }

    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { toast.error('Failed to delete note'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    setActiveNoteId(prev => prev === id ? null : prev);
  }, []);

  const moveNoteToFolder = useCallback(async (noteId: string, folderId: string | null) => {
    const { error } = await supabase.from('notes').update({ folder_id: folderId, updated_at: new Date().toISOString() }).eq('id', noteId);
    if (error) { toast.error('Failed to move note'); return; }
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId, updatedAt: Date.now() } : n));
  }, []);

  const addMedia = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const unfiledNotes = notes.filter(n => n.folderId === null);
  const getNotesByFolder = useCallback((folderId: string) => notes.filter(n => n.folderId === folderId), [notes]);
  const getChildFolders = useCallback((parentId: string | null) => folders.filter(f => f.parentId === parentId), [folders]);
  const getRootFolders = useCallback(() => folders.filter(f => f.parentId === null), [folders]);

  return {
    notes, folders, activeNote, activeNoteId, isLoading,
    setActiveNoteId, createFolder, renameFolder,
    deleteFolderAndContents, deleteFolderKeepNotes,
    moveFolderToParent,
    createNote, createNoteWithContent, updateNote, deleteNote, moveNoteToFolder,
    togglePin,
    addMedia, unfiledNotes, getNotesByFolder,
    getChildFolders, getRootFolders, getDescendantFolderIds,
  };
}
