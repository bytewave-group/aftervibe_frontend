import { Button } from "framework7-react";
import PageLayout from "../components/PageLayout";
import { useTranslation } from "react-i18next";
import { navigate } from "@my-common-tool/tool/navigate";


export default function ErrorPage({ error, resetErrorBoundary }) {
  const { t } = useTranslation();
  return (
    <PageLayout
      onBackClick={() => navigate("/")}
      hideBottomMenu
      name="home"
      className="bg-page"
    >
      <div className="container text-white px-3">
        {" "}
        <h2 className="text20 text-center fw-bold pb-3 border-bottom-1 mb-2">
          Oops! Something went wrong.
        </h2>
        <p className="mb-4">
          We’re sorry for the inconvenience. Please try again or contact support
          if the problem persists.
        </p>
        {error?.message && <p className="text-red mb-4">{error.message}</p>}
        <Button
          className="btn-primary iconh40 maxw-200 mx-auto"
          onClick={resetErrorBoundary}
        >
          {t("Click here back to home")}
        </Button>
      </div>
    </PageLayout>
  );
}
