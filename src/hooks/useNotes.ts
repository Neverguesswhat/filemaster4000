import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Note, Folder } from '@/types/notes';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
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
          createdAt: new Date(f.created_at).getTime(),
        })));
        setNotes(notesRes.data.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          folderId: n.folder_id,
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

  const createFolder = useCallback(async (name: string) => {
    const { data, error } = await supabase.from('folders').insert({ name }).select().single();
    if (error) { toast.error('Failed to create folder'); return; }
    const folder: Folder = { id: data.id, name: data.name, createdAt: new Date(data.created_at).getTime() };
    setFolders(prev => [...prev, folder]);
    return folder;
  }, []);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('folders').update({ name }).eq('id', id);
    if (error) { toast.error('Failed to rename folder'); return; }
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    // First unfile notes in this folder
    await supabase.from('notes').update({ folder_id: null }).eq('folder_id', id);
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete folder'); return; }
    setFolders(prev => prev.filter(f => f.id !== id));
    setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: null } : n));
  }, []);

  const createNote = useCallback(async (folderId: string | null = null) => {
    const { data, error } = await supabase.from('notes').insert({
      title: 'Untitled',
      content: '',
      folder_id: folderId,
    }).select().single();
    if (error) { toast.error('Failed to create note'); return; }
    const note: Note = {
      id: data.id,
      title: data.title,
      content: data.content,
      folderId: data.folder_id,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
    setNotes(prev => [...prev, note]);
    setActiveNoteId(note.id);
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'folderId'>>) => {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;

    const { error } = await supabase.from('notes').update(dbUpdates).eq('id', id);
    if (error) { console.error('Failed to save note:', error); return; }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { toast.error('Failed to delete note'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    setActiveNoteId(prev => prev === id ? null : prev);
  }, []);

  const moveNoteToFolder = useCallback(async (noteId: string, folderId: string) => {
    const { error } = await supabase.from('notes').update({ folder_id: folderId, updated_at: new Date().toISOString() }).eq('id', noteId);
    if (error) { toast.error('Failed to move note'); return; }
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId, updatedAt: Date.now() } : n));
  }, []);

  const addMedia = useCallback((file: File, noteId: string, folderId: string | null): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const unfiledNotes = notes.filter(n => n.folderId === null);
  const getNotesByFolder = useCallback((folderId: string) => notes.filter(n => n.folderId === folderId), [notes]);

  return {
    notes, folders, activeNote, activeNoteId, isLoading,
    setActiveNoteId, createFolder, renameFolder, deleteFolder,
    createNote, updateNote, deleteNote, moveNoteToFolder,
    addMedia, unfiledNotes, getNotesByFolder,
  };
}
