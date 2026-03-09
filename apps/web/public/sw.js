// Orbit Service Worker — PRD-006: Push Notifications
// Handles web push events and routes notification clicks to the correct page.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Orbit", body: event.data.text(), actionUrl: "/dashboard" };
  }

  const options = {
    body: data.body ?? "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { actionUrl: data.actionUrl ?? "/dashboard" },
    actions: data.actionLabel
      ? [{ action: "open", title: data.actionLabel }]
      : [],
    requireInteraction: data.priority === "critical",
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Orbit", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.actionUrl ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
