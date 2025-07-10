import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface AvatarItem {
  avatar_id: string;
  avatar_name: string;
  gender: string | null;
  preview_image_url: string;
  preview_video_url: string;
  premium: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onSelect?: (avatar: AvatarItem) => void;
}

const BACKEND_URL =
  (import.meta as any).env?.BACKEND_URL || "http://localhost:8001";
const AVATAR_ENDPOINT = `${BACKEND_URL.replace(/\/$/, "")}/api/heygen/avatars`;

const pageLimit = 10;

const AvatarPickerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const { token } = useAuth();
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<string | "">("");
  const [premium, setPremium] = useState<string | "">("");
  const [loading, setLoading] = useState(false);

  const fetchAvatars = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageLimit),
        offset: String(offset),
      });
      if (search) params.append("search", search);
      if (gender) params.append("gender", gender);
      if (premium) params.append("premium", premium);
      const res = await fetch(`${AVATAR_ENDPOINT}?${params.toString()}`, {
        headers: {
          accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offset, search, gender, premium, token]);

  useEffect(() => {
    if (open) fetchAvatars();
  }, [open, fetchAvatars]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setOffset(0);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  // helpers
  const totalPages = Math.ceil(total / pageLimit);
  const currentPage = Math.floor(offset / pageLimit) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Avatar</DialogTitle>
          <DialogDescription>
            Choose an avatar for your video.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-6 flex flex-wrap items-end gap-3 p-2">
          <Input
            placeholder="Search avatar"
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
          <select
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">Any plan</option>
            <option value="true">Premium</option>
            <option value="false">Free</option>
          </select>
          <Button
            className="h-9 px-5"
            variant="outline"
            onClick={() => {
              setOffset(0);
              fetchAvatars();
            }}
          >
            Apply
          </Button>
        </div>
        <div className="grid max-h-[60vh] grid-cols-5 gap-4 overflow-auto p-2">
          {loading && <p className="col-span-5 text-center">Loading…</p>}
          {!loading &&
            items.map((av) => (
              <AvatarCard
                key={av.avatar_id}
                avatar={av}
                onSelect={(a) => {
                  onSelect?.(a);
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

const AvatarCard: React.FC<{
  avatar: AvatarItem;
  onSelect: (a: AvatarItem) => void;
}> = ({ avatar, onSelect }) => {
  const [hover, setHover] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(avatar)}
      className="cursor-pointer overflow-hidden rounded-md border bg-muted transition-all hover:ring-2 hover:ring-primary"
    >
      {!hover && (
        <img
          src={avatar.preview_image_url}
          alt={avatar.avatar_name}
          className="h-36 w-full object-cover"
        />
      )}
      {hover && (
        <div className="relative h-36 w-full">
          {!previewLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <svg
                className="h-5 w-5 animate-spin text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                />
              </svg>
            </div>
          )}
          <video
            src={avatar.preview_video_url}
            autoPlay
            muted
            loop
            className="h-36 w-full object-cover"
            onLoadedData={() => setPreviewLoaded(true)}
          />
        </div>
      )}
      <div className="truncate p-3 text-center text-xs">
        {avatar.avatar_name}
      </div>
    </div>
  );
};

export default AvatarPickerDialog;
