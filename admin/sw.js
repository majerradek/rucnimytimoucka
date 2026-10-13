/* Service worker of the Moučka administration (scope = the admin folder).
 * Only shows push notifications and routes clicks; no offline caching. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function parseMessage(event) {
  const fallback = { title: "Ruční mytí Moučka", body: "", path: "#/prehled", tag: "moucka", confirmable: false };
  if (!event.data) return fallback;
  try {
    return { ...fallback, ...event.data.json() };
  } catch {
    return { ...fallback, body: event.data.text() };
  }
}

self.addEventListener("push", (event) => {
  const message = parseMessage(event);
  const confirmable = Boolean(message.confirmable);
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      renotify: true,
      icon: "icon-192.png",
      badge: "icon-192.png",
      lang: "cs",
      data: { path: message.path, confirmable },
      actions: confirmable
        ? [
            { action: "confirm", title: "Potvrdit" },
            { action: "open", title: "Otevřít" },
          ]
        : [],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = typeof data.path === "string" && data.path ? data.path : "#/prehled";
  // "Potvrdit" never confirms by itself: it opens the booking with the confirm button focused.
  const target = self.registration.scope + (event.action === "confirm" ? `${path}?potvrdit=1` : path);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (existing) {
        await existing.focus();
        try {
          await existing.navigate(target);
          return;
        } catch {
          // navigate() fails for uncontrolled clients – fall back to a new window.
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", () => {
  // Re-subscribing needs the admin session token, which the worker does not have.
  // The app re-registers this device the next time it is opened (Nastavení → Upozornění).
});
