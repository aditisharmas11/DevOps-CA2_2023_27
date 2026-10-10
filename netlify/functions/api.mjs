import serverless from "serverless-http";
import { createApp } from "../../server/app.ts";

let expressHandler;

export const handler = async (event, context) => {
  if (!expressHandler) {
    const { app } = await createApp();
    expressHandler = serverless(app);
  }

  return expressHandler(event, context);
};
