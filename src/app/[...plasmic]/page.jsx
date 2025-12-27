import { PLASMIC } from "@/lib/plasmic-init";
import { PlasmicComponent, PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import { notFound } from "next/navigation";

export default async function PlasmicPage(props) {
  const { params } = props;
  const plasmicPath = params?.plasmic ? "/" + params.plasmic.join("/") : "/";
  
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    return notFound();
  }

  return (
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={plasmicData}>
      <PlasmicComponent component={plasmicPath} />
    </PlasmicRootProvider>
  );
}

export async function generateStaticParams() {
  const pages = await PLASMIC.fetchPages();
  return pages.map((page) => ({
    plasmic: page.path.split("/").filter((p) => !!p),
  }));
}

