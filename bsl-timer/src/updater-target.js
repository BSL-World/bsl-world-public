export function getUpdaterTarget(edition) {
  if (edition === 'pro') {
    return 'windows-x86_64-pro';
  }

  return 'windows-x86_64-free';
}
