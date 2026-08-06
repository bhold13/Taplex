import { authorizeProfileApi } from "@/lib/profile-auth";
import { getOwnerBookings, updateOwnerBookingStatus } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  return Response.json({ bookings: await getOwnerBookings(auth.user.email) });
}

export async function PATCH(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as { bookingId?: unknown; status?: unknown };
    const bookings = await updateOwnerBookingStatus(auth.user.email, body.bookingId, body.status);
    return Response.json({ bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking could not be updated.";
    return Response.json({ error: message }, { status: 400 });
  }
}
