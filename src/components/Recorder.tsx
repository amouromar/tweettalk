/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_SECONDS = 120;
const MAX_TITLE_WORDS = 5;

export default function Recorder() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  const [timer, setTimer] = useState(0);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    setError(null);
    setAudioUrl(null);
    setShareUrl(null);
    setTitle("");
    setChunks([]);
    setTimer(0);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    const localChunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => localChunks.push(e.data);
    recorder.onstop = () => {
      setChunks(localChunks);
      const blob = new Blob(localChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
        }
      }, 100);
    };
    recorder.start();
    setRecording(true);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t + 1 >= MAX_SECONDS) {
          stopRecording();
          return MAX_SECONDS;
        }
        return t + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const saveAndGetLink = async () => {
    if (!audioUrl) return;
    setUploading(true);
    setError(null);
    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const filename = uuidv4() + ".webm";
      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(filename, blob, { upsert: false, contentType: "audio/webm" });
      if (uploadError) throw uploadError;
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, storage_path: filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");
      setShareUrl(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const words = value.trim().split(/\s+/);
    if (words.length <= MAX_TITLE_WORDS) {
      setTitle(value);
    } else {
      setTitle(words.slice(0, MAX_TITLE_WORDS).join(" "));
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-6 bg-white/90 rounded-2xl shadow-2xl text-center border border-gray-200">
      <h1 className="text-3xl font-extrabold mb-4 text-blue-700 tracking-tight drop-shadow">AudioTweet Recorder</h1>
      {!recording && !audioUrl && (
        <button
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-8 py-3 rounded-lg font-bold text-lg shadow-md mb-2"
          onClick={startRecording}
        >
          Record
        </button>
      )}
      {recording && (
        <div>
          <div className="mb-2 text-lg font-semibold text-red-600 animate-pulse">● Recording... {timer}s</div>
          <button
            className="bg-red-600 hover:bg-red-700 transition text-white px-8 py-3 rounded-lg font-bold text-lg shadow-md"
            onClick={stopRecording}
          >
            Stop
          </button>
        </div>
      )}
      {audioUrl && (
        <div className="mt-4">
          <audio ref={audioRef} controls src={audioUrl} className="w-full mb-2 rounded-lg border border-gray-300 bg-gray-100" />
          <label className="block text-left font-bold text-gray-700 mb-1 mt-2">Audio Title (max 5 words)</label>
          <input
            className="border-2 border-blue-200 focus:border-blue-500 px-3 py-2 rounded w-full mb-2 font-semibold text-gray-900 bg-blue-50 placeholder-gray-400 transition"
            placeholder="Optional title (max 5 words)"
            value={title}
            onChange={handleTitleChange}
            maxLength={60}
          />
          <button
            className="bg-green-600 hover:bg-green-700 transition text-white px-8 py-3 rounded-lg font-bold text-lg shadow-md w-full mb-2"
            onClick={saveAndGetLink}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Save & Get Link"}
          </button>
        </div>
      )}
      {shareUrl && (
        <div className="mt-4">
          <div className="mb-2 break-all font-mono text-blue-800 bg-blue-50 rounded p-2 border border-blue-200">{shareUrl}</div>
          <button
            className="bg-gray-200 hover:bg-gray-300 transition px-4 py-1 rounded mr-2 font-semibold"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
          >
            Copy Link
          </button>
          <a
            className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-1 rounded font-semibold"
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>
        </div>
      )}
      {error && <div className="text-red-600 mt-2 font-semibold">{error}</div>}
      <div className="text-xs text-gray-500 mt-6">
        Max recording length: {MAX_SECONDS} seconds. All recordings are public. <a href="/privacy" className="underline">Privacy Policy</a>
      </div>
    </div>
  );
} 