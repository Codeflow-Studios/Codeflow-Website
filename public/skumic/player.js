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
  const festivalPlayer = featuredGame.querySelector(".featured-game-player");
  const festivalFrame = featuredGame.querySelector(".featured-game-frame");
  const fullscreenButton = featuredGame.querySelector(".fullscreen-toggle");
  let pageFullscreen = false;

  function updateFullscreen() {
    const fullscreen = pageFullscreen || document.fullscreenElement === festivalPlayer;
    festivalPlayer.classList.toggle("is-fullscreen", fullscreen);
    document.documentElement.classList.toggle("festival-fullscreen", fullscreen);
    fullscreenButton.textContent = fullscreen ? "Volledig scherm sluiten" : "Volledig scherm";
  }

  fullscreenButton.addEventListener("click", async (event) => {
    if (pageFullscreen) {
      pageFullscreen = false;
      updateFullscreen();
    } else if (document.fullscreenElement === festivalPlayer) {
      await document.exitFullscreen();
    } else {
      if (document.fullscreenEnabled && festivalPlayer.requestFullscreen) {
        try {
          await festivalPlayer.requestFullscreen();
          if (event.detail) festivalFrame.focus({ preventScroll: true });
          return;
        } catch {
          // Use the full browser window when native fullscreen is unavailable.
        }
      }
      pageFullscreen = true;
      updateFullscreen();
    }
    if (event.detail) festivalFrame.focus({ preventScroll: true });
  });

  function closePageFullscreen(event) {
    const activeDocument = event.currentTarget;
    if (!pageFullscreen || event.key !== "Escape" || event.defaultPrevented ||
        activeDocument.pointerLockElement || activeDocument.querySelector("dialog[open]")) return;
    event.preventDefault();
    pageFullscreen = false;
    updateFullscreen();
    fullscreenButton.focus({ preventScroll: true });
  }

  function listenForFestivalEscape() {
    festivalFrame.contentDocument?.addEventListener("keydown", closePageFullscreen);
  }

  document.addEventListener("fullscreenchange", updateFullscreen);
  document.addEventListener("keydown", closePageFullscreen);
  festivalFrame.addEventListener("load", listenForFestivalEscape);
  listenForFestivalEscape();
  fullscreenButton.hidden = false;

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
