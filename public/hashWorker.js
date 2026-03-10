self.onmessage = async function (e) {
   const { chunk } = e.data;

   const buffer = await chunk.arrayBuffer();

   const hash = await crypto.subtle.digest("SHA-256", buffer);

   const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

   self.postMessage({ hash: hex });
};
