import './bubbles.css';
import { navigate } from '../../navigation';
import { BubbleGame } from './bubbleGame';
import { loadBubbles, saveBubbles } from './bubbleSave';

export function startBubbleChallenge(day: string): void {
  const save = loadBubbles();
  save.challenge = day;
  saveBubbles(save);
  navigate('#/bulles');
}

export function renderBubbles(root: HTMLElement): () => void {
  let game: BubbleGame | null = null;
  const start = () => {
    game?.dispose();
    root.replaceChildren();
    game = new BubbleGame(root, loadBubbles(), { replay: start });
  };
  start();
  return () => game?.dispose();
}
