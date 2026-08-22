export async function GET(): Promise<Response> {
  return Response.json(
    { error: 'Bootstrap is disabled. Use an explicit out-of-band admin bootstrap procedure.' },
    { status: 403 }
  );
}

export async function POST(): Promise<Response> {
  return Response.json(
    { error: 'Bootstrap is disabled. Use an explicit out-of-band admin bootstrap procedure.' },
    { status: 403 }
  );
}
