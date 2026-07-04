import axios from "axios";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Webcam from "react-webcam";
import { searchStudentsByFace } from "../../../api/faceSearchApi";
import type { NavAutocompleteSuggestion } from "../../../types/navAutocomplete";
import StudentResultList from "../../../components/StudentResultList";
import { resizeImageToJpeg } from "../../../utils/imageResize";

type FaceSearchModalProps = {
  onClose: () => void;
  onSelectStudent: (suggestion: NavAutocompleteSuggestion) => void;
};

type SourceTab = "webcam" | "upload";

export default function FaceSearchModal({ onClose, onSelectStudent }: FaceSearchModalProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>("webcam");
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<NavAutocompleteSuggestion[] | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetCapture = () => {
    setCapturedImage(null);
    setPreviewUrl(null);
    setResults(null);
    setErrorMessage("");
  };

  const handleCapture = async () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      setErrorMessage("Không thể chụp ảnh từ webcam. Vui lòng thử lại.");
      return;
    }

    setIsProcessingImage(true);
    setErrorMessage("");

    try {
      const resized = await resizeImageToJpeg(screenshot);
      setCapturedImage(resized);
      setPreviewUrl(URL.createObjectURL(resized));
      setResults(null);
    } catch {
      setErrorMessage("Không thể xử lý ảnh vừa chụp. Vui lòng thử lại.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsProcessingImage(true);
    setErrorMessage("");

    try {
      const resized = await resizeImageToJpeg(file);
      setCapturedImage(resized);
      setPreviewUrl(URL.createObjectURL(resized));
      setResults(null);
    } catch {
      setErrorMessage("Không thể xử lý ảnh đã chọn. Vui lòng thử ảnh khác.");
    } finally {
      setIsProcessingImage(false);
      event.target.value = "";
    }
  };

  const handleSearch = async () => {
    if (!capturedImage) {
      return;
    }

    setIsSearching(true);
    setErrorMessage("");
    setResults(null);

    try {
      const matches = await searchStudentsByFace(capturedImage);
      setResults(matches);
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Không thể tìm kiếm bằng khuôn mặt. Vui lòng thử lại.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTabChange = (tab: SourceTab) => {
    setActiveTab(tab);
    resetCapture();
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(14,25,48,0.52)] px-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] border border-[#bfd4f2] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_72%,#e7f0ff_100%)] shadow-[0_28px_70px_rgba(27,56,122,0.28)]">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d90b5]">
              Tìm kiếm bằng khuôn mặt
            </p>
            <p className="mt-1 text-xs text-[#8aa4cc]">
              Chụp ảnh hoặc tải ảnh của người cần tìm để hệ thống gợi ý sinh viên khớp nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#bfd2ee] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] p-2 text-[#6681b1] transition hover:border-[#97b8e8] hover:text-[#244cb8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
          <div className="flex gap-2 rounded-2xl border border-[#d6e2f1] bg-white/70 p-1.5">
            <button
              type="button"
              onClick={() => handleTabChange("webcam")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activeTab === "webcam" ? "bg-[#244cb8] text-white shadow-sm" : "text-[#5470a6] hover:bg-[#eef4ff]"
              }`}
            >
              <Camera className="h-4 w-4" /> Chụp webcam
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("upload")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activeTab === "upload" ? "bg-[#244cb8] text-white shadow-sm" : "text-[#5470a6] hover:bg-[#eef4ff]"
              }`}
            >
              <Upload className="h-4 w-4" /> Tải ảnh lên
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#d3e0f2] bg-white">
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Ảnh đã chọn" className="max-h-[320px] w-full object-contain" />
                <button
                  type="button"
                  onClick={resetCapture}
                  className="absolute right-3 top-3 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#244cb8] shadow-sm transition hover:bg-white hover:text-[#0c4f97]"
                  aria-label={activeTab === "webcam" ? "Chụp lại" : "Chọn lại"}
                >
                  {activeTab === "webcam" ? "Chụp lại" : "Chọn lại"}
                </button>
              </div>
            ) : activeTab === "webcam" ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                disablePictureInPicture
                screenshotFormat="image/jpeg"
                className="w-full"
                videoConstraints={{ facingMode: "user" }}
              />
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="flex w-full flex-col items-center justify-center gap-2 py-14 text-[#8aa4cc] transition hover:bg-[#f5f9ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-semibold">Bấm để chọn ảnh từ máy</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <p className="text-xs text-[#8aa4cc]">
            Để có kết quả chính xác nhất, vui lòng chọn ảnh chỉ có 1 khuôn mặt rõ nét.
          </p>

          {!previewUrl && activeTab === "webcam" ? (
            <button
              type="button"
              onClick={handleCapture}
              disabled={isProcessingImage}
              className="auth-btn-gloss flex w-full items-center justify-center gap-2 rounded-xl border border-[#c8d8ef] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-2.5 text-sm font-semibold text-[#244cb8] shadow-[0_8px_18px_rgba(36,76,184,0.12)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isProcessingImage ? "Đang xử lý ảnh..." : "Chụp ảnh"}
            </button>
          ) : null}

          {isProcessingImage && activeTab === "upload" ? (
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-[#5470a6]">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý ảnh...
            </p>
          ) : null}

          {previewUrl ? (
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c4f97] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(12,79,151,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tìm kiếm
            </button>
          ) : null}

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          {results ? (
            results.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-[#d3e0f2] bg-white">
                <StudentResultList suggestions={results} onSelect={onSelectStudent} />
              </div>
            ) : (
              <p className="rounded-xl border border-[#d6e2f1] bg-[#f5f9ff] px-4 py-2.5 text-sm font-medium text-[#5c7094]">
                Không tìm thấy sinh viên phù hợp, vui lòng thử ảnh khác hoặc tìm bằng tên/MSSV.
              </p>
            )
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
