let count = 1;

export function getScreenshotName(testName: string) {
  const name = testName.replace(/\s+/g, '');
  const number = count.toString().padStart(2, '0');

  count++;

  return `./screenshots/${name}${number}.png`;
}




