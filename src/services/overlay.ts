export interface GeotagInfo {
  latitude: number;
  longitude: number;
  timestamp: string;
  address: string;
  heading: string;
}

export interface OverlayResult {
  dataUrl: string;
  file: File;
  geotag: GeotagInfo;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = src;
  });
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

function formatTimestamp(date: Date): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayName = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const tz = -date.getTimezoneOffset();
  const tzSign = tz >= 0 ? "+" : "-";
  const tzH = String(Math.floor(Math.abs(tz) / 60)).padStart(2, "0");
  const tzM = String(Math.abs(tz) % 60).padStart(2, "0");
  return `${dayName}, ${dd}/${mm}/${yyyy} ${hours12}:${minutes} ${ampm} GMT ${tzSign}${tzH}:${tzM}`;
}

async function fetchTile(lat: number, lng: number, zoom: number): Promise<string | null> {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
  try {
    const res = await fetch(tileUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        let last = lines[maxLines - 1];
        while (ctx.measureText(last + "…").width > maxWidth && last.length > 0) {
          last = last.slice(0, -1);
        }
        lines[maxLines - 1] = last + "…";
        return lines;
      }
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawPreviewPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#e74c3c";
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
}

export async function applyOverlay(
  imageData: string,
  originalFileName: string,
  info: GeotagInfo
): Promise<OverlayResult> {
  const img = await loadImage(imageData);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);

  const overlayH = Math.round(H * 0.2);
  const overlayY = H - overlayH;

  const grad = ctx.createLinearGradient(0, overlayY, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0.45)");
  grad.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, overlayY, W, overlayH);

  /* ---- map thumbnail ---- */
  const pad = Math.round(overlayH * 0.07);
  const thumbSize = overlayH - pad * 2;
  const thumbX = pad;
  const thumbY = overlayY + pad;

  const tileSrc = await fetchTile(info.latitude, info.longitude, 15);
  if (tileSrc) {
    const tileImg = await loadImage(tileSrc);
    ctx.save();
    ctx.beginPath();
    ctx.rect(thumbX, thumbY, thumbSize, thumbSize);
    ctx.clip();
    ctx.drawImage(tileImg, thumbX, thumbY, thumbSize, thumbSize);
    ctx.restore();
    URL.revokeObjectURL(tileSrc);

    const pinCx = thumbX + thumbSize / 2;
    const pinCy = thumbY + thumbSize / 2 + thumbSize * 0.05;
    drawPreviewPin(ctx, pinCx, pinCy, thumbSize * 0.06);
  } else {
    ctx.fillStyle = "#1a3a2a";
    ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `${Math.round(thumbSize * 0.08)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📍", thumbX + thumbSize / 2, thumbY + thumbSize / 2 - thumbSize * 0.08);
    ctx.fillStyle = "#66b2ff";
    ctx.fillText("Map", thumbX + thumbSize / 2, thumbY + thumbSize / 2 + thumbSize * 0.1);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(thumbX, thumbY, thumbSize, thumbSize);

  /* ---- text area ---- */
  const textX = thumbX + thumbSize + pad * 1.8;
  const textMaxW = W - textX - pad;
  const lineGap = Math.round(overlayH * 0.06);
  let ty = overlayY + pad + lineGap * 0.5;

  ctx.textBaseline = "top";
  const fontScale = overlayH / 200;

  /* heading */
  const headingSize = Math.round(20 * fontScale);
  ctx.font = `bold ${headingSize}px "Segoe UI", "Arial", sans-serif`;
  ctx.fillStyle = "#ffffff";
  const headingLabel = `${info.heading}`;
  if (ctx.measureText(headingLabel).width > textMaxW) {
    const truncated = headingLabel.slice(0, Math.floor(textMaxW / (headingSize * 0.6))) + "…";
    ctx.fillText(truncated, textX, ty);
  } else {
    ctx.fillText(headingLabel, textX, ty);
  }
  ty += headingSize + lineGap * 0.5;

  /* address */
  const addrSize = Math.round(11 * fontScale);
  ctx.font = `${addrSize}px "Segoe UI", "Arial", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const addrLines = wrapText(ctx, info.address, textMaxW, 2);
  for (const line of addrLines) {
    ctx.fillText(line, textX, ty);
    ty += addrSize + 2;
  }
  ty += lineGap;

  /* coordinates */
  const coordFontSize = Math.round(14 * fontScale);
  ctx.font = `bold ${coordFontSize}px "Consolas", "Courier New", monospace`;
  ctx.fillStyle = "#ffffff";
  const coordText = `Lat ${info.latitude.toFixed(6)}°  Long ${info.longitude.toFixed(6)}°`;
  ctx.fillText(coordText, textX, ty);
  ty += coordFontSize + lineGap * 0.8;

  /* timestamp */
  const timeSize = Math.round(12 * fontScale);
  ctx.font = `${timeSize}px "Segoe UI", "Arial", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  const timeLabel = formatTimestamp(new Date(info.timestamp));
  ctx.fillText(timeLabel, textX, ty);

  /* ---- brand ---- */
  const brandSize = Math.round(14 * fontScale);
  ctx.font = `bold ${brandSize}px "Segoe UI", "Arial", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Bukang", W - pad, overlayY + pad + 2);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const blob = await dataUrlToBlob(dataUrl);
  const ext = originalFileName.includes(".") ? originalFileName.split(".").pop() : "jpg";
  const file = new File([blob], originalFileName.replace(/\.[^.]+$/, "") + `_overlay.${ext}`, {
    type: "image/jpeg",
  });

  return { dataUrl, file, geotag: info };
}
