import React from "react";
import { View } from "framework7-react";
import routes from "../library/routes";

export default function MyApp() {
  return (
    <View
      main
      browserHistory
      browserHistorySeparator=""
      url="/"
      routes={routes}
    />
  );
}