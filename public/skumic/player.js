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
    const availableWidth = featuredGame.clientWidth;
    const top = viewport.getBoundingClientRect().top + window.scrollY;
    const availableHeight = Math.max(1, window.innerHeight - top - 12);
    const heightBelowHeader = window.innerHeight - header.offsetHeight;
    const portrait = availableWidth <= 700 && heightBelowHeader >= availableWidth;
    const frameWidth = portrait ? 430 : Math.max(820, availableWidth);
    // Reserve space for the original game's header, playfield and controls.
    const frameHeight = portrait ? 620 : Math.ceil(frameWidth / 2) + (frameWidth <= 1050 ? 218 : 222);
    const scale = Math.min(1, availableWidth / frameWidth, availableHeight / frameHeight);

    viewport.style.setProperty("--frame-width", frameWidth + "px");
    viewport.style.setProperty("--frame-height", frameHeight + "px");
    viewport.style.setProperty("--frame-scale", String(scale));
    featuredGame.style.setProperty("--fitted-width", frameWidth * scale + "px");
    viewport.style.setProperty("--fitted-height", frameHeight * scale + "px");
  }

  fitFeaturedGame();
  window.addEventListener("resize", fitFeaturedGame);
  const topLayout = new ResizeObserver(fitFeaturedGame);
  topLayout.observe(header);
  topLayout.observe(marquee);
}
