import Activate from "./Activate";

// The activation itself runs client-side and reports its outcome in place, so
// this page only resolves the route params for it.
export default async function Page({
  params,
}: {
  params: Promise<{ uid: string; token: string }>;
}) {
  const { uid, token } = await params;
  return <Activate uid={uid} token={token} />;
}
