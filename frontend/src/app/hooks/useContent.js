export async function fetchBestContent(
  deviceInfo,
  requestedContent,
  failedId = null
) {
  const response = await fetch("http://localhost:8000/api/get-content/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_info: deviceInfo,
      requested_content: requestedContent,
      ...(failedId && { failed_content_id: failedId }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "콘텐츠 요청 실패");
  }

  return await response.json();
}
