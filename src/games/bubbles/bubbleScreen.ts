import './bubbles.css';
import { BubbleGame } from './bubbleGame';
import { loadBubbles } from './bubbleSave';

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
