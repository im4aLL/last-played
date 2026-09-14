export type Keybinding = {
  keys: string[];
  label: string;
};

export type KeybindingGroup = {
  title: string;
  bindings: Keybinding[];
};

export const KEYBINDING_GROUPS: KeybindingGroup[] = [
  {
    title: "Playback",
    bindings: [
      { keys: ["Space", "K"], label: "Play or pause" },
      { keys: ["Left", "J"], label: "Back 10 seconds" },
      { keys: ["Right", "L"], label: "Forward 10 seconds" },
      { keys: ["Up"], label: "Volume up" },
      { keys: ["Down"], label: "Volume down" },
      { keys: ["M"], label: "Mute" },
      { keys: ["["], label: "Slower" },
      { keys: ["]"], label: "Faster" },
    ],
  },
  {
    title: "Episodes",
    bindings: [
      { keys: ["N"], label: "Next episode" },
      { keys: ["B"], label: "Previous episode" },
      { keys: ["Shift", "N"], label: "Next season" },
      { keys: ["Shift", "B"], label: "Previous season" },
    ],
  },
  {
    title: "Tracks",
    bindings: [
      { keys: ["S"], label: "Next subtitle track" },
      { keys: ["A"], label: "Next audio track" },
      { keys: ["C"], label: "Toggle subtitles" },
      { keys: ["+", "="], label: "Bigger subtitles" },
      { keys: ["-", "_"], label: "Smaller subtitles" },
    ],
  },
  {
    title: "Window",
    bindings: [
      { keys: ["F"], label: "Toggle fullscreen" },
      { keys: ["Esc"], label: "Exit fullscreen or close player" },
      { keys: ["?"], label: "Show shortcuts" },
    ],
  },
];
