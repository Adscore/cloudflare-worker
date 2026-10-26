export function contactUint8Array(elements: Uint8Array[]) {
  const totalLength = elements.reduce((prev, curr) => {
    prev += curr.length;
    return prev;
  }, 0);

  const result = new Uint8Array(totalLength);

  let pos = 0;

  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];

    result.set(element, pos);

    pos += element.length;
  }

  return result;
}
