import { open } from "@tauri-apps/plugin-dialog";

export const VIDEO_EXTENSIONS = [
  "mp4",
  "mkv",
  "avi",
  "mov",
  "m4v",
  "webm",
  "wmv",
  "flv",
  "ts",
];

export async function pickVideoFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Choose a video file",
    filters: [{ name: "Video", extensions: VIDEO_EXTENSIONS }],
  });
  return typeof selected === "string" ? selected : null;
}
