import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAudioTranscriptionReturn {
  isRecording: boolean;
  transcript: string;
  startRecording: () => void;
  stopRecording: () => Promise<string>;
}

export function useAudioTranscription(): UseAudioTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    transcriptRef.current = '';
    setTranscript('');

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current = finalTranscript + interim;
      setTranscript(transcriptRef.current);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        toast.error(`Recording error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.success('Recording started — speak now');
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        resolve(transcriptRef.current.trim());
        return;
      }

      recognition.onend = () => {
        setIsRecording(false);
        const result = transcriptRef.current.trim();
        resolve(result);
      };

      recognition.stop();
    });
  }, []);

  return { isRecording, transcript, startRecording, stopRecording };
}
