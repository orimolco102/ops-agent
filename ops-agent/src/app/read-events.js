export async function readEvents(response, onEvent) {
    if (!response.ok) {
        onEvent({ type: "error", message: `the site returned HTTP ${response.status}` });
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
            if (!line.trim()) continue;
            onEvent(JSON.parse(line));
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) onEvent(JSON.parse(buffer));
}






// export async function readEvents(response, onEvent) {

//     if (!response.ok) {
//         onEvent({ type: "error", message: `the site returned HTTP ${response.status}`});
//         return;
//     }

//     const reader = response.body.getReader();
//     const decoder = new TextDecoder();

//     let buffer = "";

//     while (true) {
//         const {value, done} = await reader.read();
//         if (done) break;

//         buffer += decoder.decode(value, {stream: true});
//         const lines = buffer.split("\n");

//         for(const line of lines) {
//             onEvent(JSON.parse(line));
//         }
//     }
// }
