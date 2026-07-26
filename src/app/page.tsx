import { connection } from "next/server";

import { MediaStudio } from "@/components/media-studio";
import { getPortfolioSnapshot } from "@/lib/cloudinary";

export default async function Home() {
  await connection();
  const snapshot = await getPortfolioSnapshot();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <MediaStudio snapshot={snapshot} />
    </div>
  );
}
