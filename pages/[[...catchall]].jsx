import * as React from "react";
import { PLASMIC } from "@/plasmic-init";
import { PlasmicComponent, PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import Error from "next/error";

export default function PlasmicPage(props) {
  const { plasmicData, queryParams } = props;
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryParams}
    >
      <PlasmicComponent component={plasmicData.entryCompMetas[0].displayName} />
    </PlasmicRootProvider>
  );
}

export const getStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath = typeof catchall === 'string' ? catchall : catchall?.join('/') || '/';
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // This is where you could return 404
    return { notFound: true };
  }
  
  return {
    props: {
      plasmicData,
    },
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 60 seconds
    revalidate: 60,
  };
};

export const getStaticPaths = async () => {
  const pages = await PLASMIC.fetchPages();
  return {
    paths: pages.map((page) => ({
      params: {
        catchall: page.path.substring(1).split("/").filter((p) => !!p),
      },
    })),
    fallback: "blocking",
  };
};

