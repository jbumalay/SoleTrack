import { useState, useEffect } from "react";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import { apiService } from "@/services/api";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  inputClassName?: string;
}

/** File picker with client-side validation + URL fallback for product visuals. */
export function ImagePicker({ value, onChange, inputClassName }: ImagePickerProps) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, GIF or AVIF images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image must be 2MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const response = await apiService.uploadProductImage(file);
      if (response.status === "success" && response.data?.url) {
        onChange(response.data.url);
        setPreview(response.data.url);
        toast.success("Image uploaded");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Artifact Visual</label>
      <div className="flex items-center gap-4">
        <label className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:border-primary hover:text-primary transition-all">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading..." : "Upload Image (max 2MB)"}
          <input type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {preview && (
        <div className="aspect-square w-full max-w-[12rem] rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
          <img src={preview} alt="Visual preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
        </div>
      )}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-2">or paste an image URL</p>
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
          placeholder="https://images.unsplash.com/..."
          className={inputClassName ?? "w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"}
        />
      </div>
    </div>
  );
}
