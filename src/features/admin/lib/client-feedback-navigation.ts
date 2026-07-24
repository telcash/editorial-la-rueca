export function navigateWithFeedback(feedback: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('feedback', feedback);
  window.location.assign(url.toString());
}
