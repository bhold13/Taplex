import { createNativeBooking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== requestUrl.origin) || fetchSite === "cross-site") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const booking = await createNativeBooking(body.handle, body);
    return Response.json({ booking, message: "Booking request sent. The creator will confirm with you directly." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking could not be submitted.";
    return Response.json({ error: message }, { status: 400 });
  }
}
