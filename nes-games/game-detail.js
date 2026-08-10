/* ============================================================
   NES 游戏详情页 - 工具栏、重新开始、全屏与点赞逻辑
   ============================================================ */

window.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById("frame-wrap");
  const loading = document.getElementById("loading");
  
  if (wrap && loading) {
    const iframe = wrap.querySelector("iframe");
    if (iframe) {
      iframe.addEventListener("load", () => {
        loading.style.display = "none";
      });
      // 降级超时隐藏 loading
      setTimeout(() => {
        if (loading) loading.style.display = "none";
      }, 5000);
    }
  }

  const restartBtn = document.getElementById("btn-restart");
  if (restartBtn && wrap) {
    restartBtn.addEventListener("click", () => {
      const iframe = wrap.querySelector("iframe");
      if (iframe) iframe.src = iframe.src;
    });
  }

  const fsBtn = document.getElementById("btn-fullscreen");
  if (fsBtn && wrap) {
    fsBtn.addEventListener("click", () => {
      const iframe = wrap.querySelector("iframe");
      if (iframe) {
        if (iframe.requestFullscreen) iframe.requestFullscreen();
        else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
      }
    });
  }

  let liked = false, disliked = false;
  const likeBtn = document.getElementById("btn-like");
  const dislikeBtn = document.getElementById("btn-dislike");
  const likeCountEl = document.getElementById("like-count");
  const dislikeCountEl = document.getElementById("dislike-count");
  
  const lc = likeCountEl ? parseInt(likeCountEl.textContent || "900", 10) : 900;
  const dc = dislikeCountEl ? parseInt(dislikeCountEl.textContent || "90", 10) : 90;

  if (likeBtn && likeCountEl) {
    likeBtn.addEventListener("click", () => {
      if (liked) {
        liked = false;
        likeCountEl.textContent = lc;
      } else {
        liked = true;
        if (disliked) {
          disliked = false;
          if (dislikeCountEl) dislikeCountEl.textContent = dc;
        }
        likeCountEl.textContent = lc + 1;
      }
    });
  }

  if (dislikeBtn && dislikeCountEl) {
    dislikeBtn.addEventListener("click", () => {
      if (disliked) {
        disliked = false;
        dislikeCountEl.textContent = dc;
      } else {
        disliked = true;
        if (liked) {
          liked = false;
          if (likeCountEl) likeCountEl.textContent = lc;
        }
        dislikeCountEl.textContent = dc + 1;
      }
    });
  }

  // 模拟浏览量微增
  const viewCountEl = document.getElementById("view-count");
  if (viewCountEl) {
    let vc = parseInt(viewCountEl.textContent || "2000", 10);
    setInterval(() => {
      vc += Math.floor(Math.random() * 3);
      viewCountEl.textContent = vc;
    }, 8000);
  }
});
