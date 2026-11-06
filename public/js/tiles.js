export const TILES = [
  "What is a personal rule or boundary that you have set for yourself recently?",
  "What is a small, everyday thing that makes you feel cared for?",
  "Name 5 people playing this game.",
  "Share one thing about yourself that not a lot of people know.",
  "Who are your marble jar friends? (People who have earned your trust and whom you can be vulnerable with)",
  "What is your favorite part of today or this week?",
  "What's your comfort food? Share with the group how to make it.",
  "Choose a tandem or player to move one tile forward.",
  "Compliment the person in front of you.",
  "What is something you are most afraid of?",
  "Send a short text or message to someone you have not talked to in a while.",
  "What is something that you find most challenging recently?",
  "How do you cope when you feel stressed?",
  "Recommend your favorite book or movie.",
  "Choose a tandem or player to move one tile forward.",
  "Share a quote with the group that helps you in tough times.",
  "What is something you are currently waiting for or hoping will happen in your life?",
  "What is a principle or wisdom that guides your actions until today?",
  "List 3 good things that happened today on your phone's notes.",
  "Sing a few lines from your feel good song or your last song syndrome.",
  "Give 5 names of the players that have not yet been mentioned.",
  "Choose a tandem or player to move one tile forward (you can't choose yourself).",
  "How would you comfort a friend who is having a hard time?",
  "Give a short message to everyone.",
];

export const FINISH = TILES.length;
export const MOVE_TILES = [8, 15, 22];
export const NO_SELF_TILES = [22];
export const SKIP_PENALTY = 2;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 30;
export const PODIUM_SIZE = 3;

// One symbol per player who can join at once, so this must have at least MAX_PLAYERS entries.
export const SYMBOLS = ["🦊", "🐻", "🐼", "🐸", "🐯", "🐙", "🦄", "🐝", "🐢", "🦋", "🐧", "🐨",
  "🐰", "🐱", "🐶", "🐷", "🐮", "🦁", "🐵", "🦉", "🦇", "🐺", "🦒", "🦓", "🐳", "🦈", "🦀", "🐬", "🐿️", "🦔"];
export const COLORS = ["#E4572E", "#2E86DE", "#17A589", "#8E44AD", "#F39C12", "#D81B60", "#5D6D7E", "#27AE60", "#C0392B", "#00897B",
  "#3F51B5", "#8D6E63", "#009688", "#7CB342", "#EC407A", "#546E7A", "#FFA000", "#5E35B1", "#039BE5", "#AD1457"];

export const tileText = n => TILES[n - 1] || "";
