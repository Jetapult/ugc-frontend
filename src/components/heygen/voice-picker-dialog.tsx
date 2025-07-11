import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { api } from "@/lib/api";

interface VoiceItem {
  voice_id: string;
  name: string;
  gender: string;
  language: string;
  preview_audio?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (voice: VoiceItem) => void;
}


const pageLimit = 16;

const VoicePickerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  

  const [items, setItems] = useState<VoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchVoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: String(pageLimit),
        offset: String(offset),
        ...(search ? { search } : {}),
        ...(gender ? { gender } : {}),
        ...(language ? { language } : {}),
      };

      const data: any = await api.heygen.voices(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offset, search, gender, language]);

  useEffect(() => {
    if (open) fetchVoices();
  }, [open, fetchVoices]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setOffset(0);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const totalPages = Math.ceil(total / pageLimit);
  const currentPage = Math.floor(offset / pageLimit) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Voice</DialogTitle>
          <DialogDescription>
            Choose a voice for text-to-speech.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-6 flex flex-wrap items-end gap-3 p-2">
          <Input
            placeholder="Search voice"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-56"
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">Any gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <Input
            placeholder="Language (e.g. English)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-40"
          />
          <Button
            className="h-9 px-5"
            variant="outline"
            onClick={() => {
              setOffset(0);
              fetchVoices();
            }}
          >
            Apply
          </Button>
        </div>
        <div className="grid max-h-[60vh] grid-cols-4 gap-4 overflow-auto p-2">
          {loading && <p className="col-span-4 text-center">Loading…</p>}
          {!loading &&
            items.map((v) => (
              <VoiceCard
                key={v.voice_id}
                voice={v}
                onSelect={(voice) => {
                  onSelect?.(voice);
                  onOpenChange(false);
                }}
              />
            ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageLimit))}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            disabled={offset + pageLimit >= total}
            onClick={() => setOffset(offset + pageLimit)}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VoiceCard: React.FC<{
  voice: VoiceItem;
  onSelect: (v: VoiceItem) => void;
}> = ({ voice, onSelect }) => {
  const [hover, setHover] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (hover && voice.preview_audio) {
      if (!audioRef.current) {
        audioRef.current = new Audio(voice.preview_audio);
      }
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(true));
    } else {
      audioRef.current?.pause();
      audioRef.current?.currentTime && (audioRef.current.currentTime = 0);
      setPlaying(false);
    }
    // pause on unmount
    return () => {
      audioRef.current?.pause();
      setPlaying(false);
    };
  }, [hover, voice.preview_audio]);

  return (
    <div
      className="relative cursor-pointer rounded-md border bg-muted p-3 transition-all hover:ring-2 hover:ring-primary"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(voice)}
    >
      <p className="truncate text-sm font-medium" title={voice.name}>
        {voice.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {voice.language} • {voice.gender}
      </p>
      {playing && (
        <span className="absolute bottom-2 right-2 text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 animate-pulse"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 4.5a1 1 0 00-1.707-.707L4.586 6.5H2a1 1 0 000 2h2.586l2.707 2.707A1 1 0 009 10.5v-6z" />
            <path d="M13.536 4.464a1 1 0 10-1.414 1.414 4 4 0 010 5.657 1 1 0 101.414 1.414 6 6 0 000-8.485z" />
            <path d="M15.95 2.05a1 1 0 10-1.414 1.414 8 8 0 010 11.314 1 1 0 101.414 1.414 10 10 0 000-14.142z" />
          </svg>
        </span>
      )}
      {!voice.preview_audio && (
        <p className="mt-2 text-xs italic text-muted-foreground">No preview</p>
      )}
    </div>
  );
};

export default VoicePickerDialog;
