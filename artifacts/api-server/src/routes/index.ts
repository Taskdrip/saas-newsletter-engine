import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import organizationsRouter from "./organizations";
import workspacesRouter from "./workspaces";
import subscribersRouter from "./subscribers";
import listsRouter from "./lists";
import campaignsRouter from "./campaigns";
import templatesRouter from "./templates";
import automationsRouter from "./automations";
import smtpRouter from "./smtp";
import apiKeysRouter from "./apikeys";
import formsRouter from "./forms";
import analyticsRouter from "./analytics";
import billingRouter from "./billing";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(organizationsRouter);
router.use(workspacesRouter);
router.use(subscribersRouter);
router.use(listsRouter);
router.use(campaignsRouter);
router.use(templatesRouter);
router.use(automationsRouter);
router.use(smtpRouter);
router.use(apiKeysRouter);
router.use(formsRouter);
router.use(analyticsRouter);
router.use(billingRouter);
router.use(adminRouter);

export default router;
