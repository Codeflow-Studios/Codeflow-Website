"use strict";

const player = document.querySelector("#media-player");
const title = document.querySelector("#player-title");
const original = document.querySelector("#player-original");
const stage = document.querySelector("#player-stage");
let opener;

if (typeof player.showModal === "function") {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-embed]");
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const frame = document.createElement("iframe");
    frame.title = link.dataset.title;
    frame.allow = "autoplay; fullscreen; encrypted-media; gamepad; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = link.dataset.embed;

    title.textContent = frame.title;
    original.href = link.href;
    opener = link;
    player.dataset.kind = link.dataset.kind;
    player.showModal();
    stage.replaceChildren(frame);
  });

  player.addEventListener("close", () => {
    if (player.open) return;
    stage.replaceChildren();
    opener?.focus();
  });
}

const featuredGame = document.querySelector(".featured-game");
if (featuredGame) {
  const viewport = featuredGame.querySelector(".featured-game-viewport");
  const header = document.querySelector(".site-header");
  const marquee = document.querySelector(".arcade-marquee");

  function fitFeaturedGame() {
    const top = viewport.getBoundingClientRect().top + window.scrollY;
    viewport.style.setProperty("--game-top", top + "px");
  }

  fitFeaturedGame();
  window.addEventListener("resize", fitFeaturedGame);
  const topLayout = new ResizeObserver(fitFeaturedGame);
  topLayout.observe(header);
  topLayout.observe(marquee);
}
