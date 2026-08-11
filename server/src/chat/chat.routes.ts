import { Router } from "express";
import * as chatController from "./chat.controller.js";
import { uploadResumeFiles } from "../files/upload.middleware.js";

export const chatRouter = Router();

chatRouter.post("/", chatController.createChat);
chatRouter.get("/", chatController.listChats);
chatRouter.get("/:chatId", chatController.getChat);
chatRouter.post("/:chatId/message", uploadResumeFiles, chatController.sendMessage);
chatRouter.post(
  "/:chatId/message/stream",
  uploadResumeFiles,
  chatController.streamMessage,
);
