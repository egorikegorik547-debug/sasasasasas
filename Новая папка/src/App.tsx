import { useEffect } from "react";
import "@fontsource/marck-script/cyrillic.css";
import "@fontsource/marck-script/latin.css";

// Игра запускается ровно один раз (React StrictMode вызывает эффект дважды).
let started = false;

export default function App() {
  useEffect(() => {
    if (started) return;
    started = true;
    (async () => {
      try {
        const { MARKUP } = await import("./game/markup");
        const root = document.getElementById("gameRoot");
        if (root) root.innerHTML = MARKUP;
        const [{ startGame }, { iconizeDom }] = await Promise.all([
          import("./game/game"),
          import("./game/icons"),
        ]);
        startGame();
        iconizeDom(document.body);
      } catch (err) {
        // Если запуск упал — кнопки останутся без обработчиков, поэтому показываем причину прямо на экране.
        console.error("Ошибка запуска игры:", err);
        const root = document.getElementById("gameRoot");
        if (root) {
          const pre = document.createElement("pre");
          pre.style.cssText =
            "position:fixed;inset:0;z-index:9999;margin:0;padding:1rem;background:#000;color:#f66;white-space:pre-wrap;font:12px monospace;overflow:auto";
          pre.textContent = "Ошибка запуска игры:\n\n" + ((err as Error)?.stack || String(err));
          root.appendChild(pre);
        }
      }
    })();
  }, []);

  return <div id="gameRoot" />;
}
