import React, { useEffect } from "react";
import PageLayout from "../components/PageLayout";
import PreLoader from "../components/common/pre-loader";

const NotFoundPage = () => {
  useEffect(() => {
    setTimeout(() => {});
  }, []);
  return (
    <PageLayout name="404" className="bg-page">
      <PreLoader />
    </PageLayout>
  );
};

export default NotFoundPage;
