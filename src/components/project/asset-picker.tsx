import React, { useEffect, useState } from "react";
import { api, ProjectAsset } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AssetPickerProps {
  projectId: string;
  onSelect: (asset: ProjectAsset) => void;
  selectedAssetId?: string;
  onBack?: () => void;
}

const AssetPicker: React.FC<AssetPickerProps> = ({
  projectId,
  onSelect,
  selectedAssetId,
  onBack,
}) => {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "uploads" | "heygen_exports" | "veo3_exports"
  >("all");
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
  });
  const [hasMore, setHasMore] = useState(false);

  const fetchAssets = async (
    filter: typeof selectedFilter,
    offset = 0,
    append = false,
  ) => {
    if (!projectId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.projects.assets(projectId, {
        asset_type: filter,
        limit: pagination.limit,
        offset,
      });

      const newAssets = response.data || [];
      setAssets((prev) => (append ? [...prev, ...newAssets] : newAssets));

      if (response.pagination) {
        setPagination(response.pagination);
        setHasMore(
          response.pagination.offset + response.pagination.limit <
            response.pagination.total,
        );
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error("Failed to fetch assets:", err);
      setError("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets(selectedFilter, 0, false);
  }, [projectId, selectedFilter]);

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case "upload":
        return "Upload";
      case "heygen_export":
        return "HeyGen";
      case "veo3_export":
        return "Veo3";
      default:
        return type;
    }
  };

  const isVideoAsset = (asset: ProjectAsset) => {
    const mimeType = asset.metadata?.mime_type as string;
    return (
      mimeType?.startsWith("video/") ||
      asset.type === "heygen_export" ||
      asset.type === "veo3_export"
    );
  };

  // Filter to only show video assets (API already filters by type)
  const videoAssets = assets.filter(isVideoAsset);
  const selectedAsset = selectedAssetId
    ? videoAssets.find((asset) => asset.id === selectedAssetId)
    : null;

  // Static filter options (API handles the filtering)
  const filterOptions = [
    { value: "all" as const, label: "All Videos" },
    { value: "uploads" as const, label: "Uploads" },
    { value: "heygen_exports" as const, label: "HeyGen" },
    { value: "veo3_exports" as const, label: "Veo3" },
  ];

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchAssets(selectedFilter, pagination.offset + pagination.limit, true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading assets...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  // Show empty state with filter selector if no assets found
  if (videoAssets.length === 0 && !loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">
            Filter by type:
          </h4>
          <select
            value={selectedFilter}
            onChange={(e) =>
              setSelectedFilter(e.target.value as typeof selectedFilter)
            }
            className="rounded border bg-background px-2 py-1 text-xs"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            {selectedFilter === "all"
              ? "No video assets found in this project"
              : `No ${getAssetTypeLabel(selectedFilter)} videos found`}
          </p>
        </div>
      </div>
    );
  }

  // If an asset is selected, show only that asset with back button
  if (selectedAsset && onBack) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">
            Selected asset:
          </h4>
          <Button variant="outline" size="sm" onClick={onBack}>
            Select Another Video
          </Button>
        </div>
        <div className="rounded-md border bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            {selectedAsset.thumbnail_url ? (
              <img
                src={selectedAsset.thumbnail_url}
                alt={selectedAsset.name}
                className="h-16 w-16 rounded object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                <span className="text-xs text-muted-foreground">
                  {getAssetTypeLabel(selectedAsset.type)}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedAsset.name}
              </p>
              <span className="mt-1 inline-block rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                {getAssetTypeLabel(selectedAsset.type)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">
          Existing assets:
        </h4>
        <select
          value={selectedFilter}
          onChange={(e) =>
            setSelectedFilter(e.target.value as typeof selectedFilter)
          }
          className="rounded border bg-background px-2 py-1 text-xs"
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        <div className="-m-1 grid max-h-64 grid-cols-2 gap-3 overflow-y-auto p-1">
          {videoAssets.map((asset) => (
            <div
              key={asset.id}
              className={`relative cursor-pointer rounded-md border transition-all hover:ring-2 hover:ring-primary ${
                selectedAssetId === asset.id
                  ? "bg-primary/5 ring-2 ring-primary"
                  : "bg-muted"
              }`}
              onClick={() => onSelect(asset)}
            >
              {asset.thumbnail_url ? (
                <img
                  src={asset.thumbnail_url}
                  alt={asset.name}
                  className="h-20 w-full rounded-t-md object-cover"
                />
              ) : (
                <div className="flex h-20 w-full items-center justify-center rounded-t-md bg-muted">
                  <span className="text-xs text-muted-foreground">
                    {getAssetTypeLabel(asset.type)}
                  </span>
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1 truncate text-xs font-medium text-foreground">
                    {asset.name}
                  </span>
                  <span className="flex-shrink-0 rounded bg-background px-2 py-1 text-xs text-muted-foreground">
                    {getAssetTypeLabel(asset.type)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loading}
              className="text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetPicker;
