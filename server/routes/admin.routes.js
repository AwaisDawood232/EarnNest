import { Router } from "express";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { listDeposits, getReceipt, approve, reject } from "../controllers/admin.controller.js";
import { list as listPlansAdmin, create as createPlan, update as updatePlan, remove as removePlan } from "../controllers/admin.plans.controller.js";
import { listMembers, getMember, setSuspended, removeMember } from "../controllers/admin.members.controller.js";
import {
  notifications, list as listWithdrawals, detail as withdrawalDetail, approve as approveWithdrawal,
  reject as rejectWithdrawal, getWithdrawalSettings, updateWithdrawalSettings,
} from "../controllers/admin.withdrawals.controller.js";
import { crudFor, listEngagement, saveSettings } from "../controllers/admin.engagement.controller.js";
import { adminGet as adminGetCommunity, adminSave as adminSaveCommunity } from "../controllers/community.controller.js";
import {
  list as listPromos, create as createPromo, update as updatePromo,
  remove as removePromo, saveSettings as savePromoSettings,
} from "../controllers/admin.promos.controller.js";
import { adVideoUpload } from "../middleware/adupload.middleware.js";
import {
  list as listAds, activity as adActivity, create as createAd, update as updateAd,
  remove as removeAd, uploadVideo as uploadAdVideo, saveSettings as saveAdSettings,
} from "../controllers/admin.ads.controller.js";
import { methodLogoUpload } from "../middleware/methodlogo.middleware.js";
import {
  list as listPayAccounts, create as createPayAccount, update as updatePayAccount,
  remove as removePayAccount, uploadLogo as uploadPayLogo,
} from "../controllers/admin.payments.controller.js";



const router = Router();

router.get("/deposits", requireAdmin, listDeposits);
router.get("/deposits/:id/receipt", requireAdmin, getReceipt);
router.post("/deposits/:id/approve", requireAdmin, approve);
router.post("/deposits/:id/reject", requireAdmin, reject);


router.get("/plans", requireAdmin, listPlansAdmin);
router.post("/plans", requireAdmin, createPlan);
router.patch("/plans/:id", requireAdmin, updatePlan);
router.delete("/plans/:id", requireAdmin, removePlan);

router.get("/members", requireAdmin, listMembers);
router.get("/members/:uid", requireAdmin, getMember);
router.post("/members/:uid/suspend", requireAdmin, setSuspended);
router.delete("/members/:uid", requireAdmin, removeMember);

router.get("/notifications", requireAdmin, notifications);
router.get("/withdrawals", requireAdmin, listWithdrawals);
router.get("/withdrawals/settings", requireAdmin, getWithdrawalSettings);
router.put("/withdrawals/settings", requireAdmin, updateWithdrawalSettings);
router.get("/withdrawals/:id", requireAdmin, withdrawalDetail);
router.post("/withdrawals/:id/approve", requireAdmin, approveWithdrawal);
router.post("/withdrawals/:id/reject", requireAdmin, rejectWithdrawal);

router.get("/engagement", requireAdmin, listEngagement);
router.put("/engagement/settings", requireAdmin, saveSettings);
for (const [name, h] of Object.entries(crudFor)) {
  router.post(`/engagement/${name}`, requireAdmin, h.create);
  router.patch(`/engagement/${name}/:id`, requireAdmin, h.update);
  router.delete(`/engagement/${name}/:id`, requireAdmin, h.remove);
}

router.get("/community", requireAdmin, adminGetCommunity);
router.put("/community", requireAdmin, adminSaveCommunity);

router.get("/promos", requireAdmin, listPromos);
router.put("/promos/settings", requireAdmin, savePromoSettings);
router.post("/promos", requireAdmin, createPromo);
router.patch("/promos/:id", requireAdmin, updatePromo);
router.delete("/promos/:id", requireAdmin, removePromo);


router.get("/ads", requireAdmin, listAds);
router.get("/ads/activity", requireAdmin, adActivity);
router.put("/ads/settings", requireAdmin, saveAdSettings);
router.post("/ads/upload", requireAdmin, adVideoUpload, uploadAdVideo);
router.post("/ads", requireAdmin, createAd);
router.patch("/ads/:id", requireAdmin, updateAd);
router.delete("/ads/:id", requireAdmin, removeAd);

router.get("/payment-methods", requireAdmin, listPayAccounts);
router.post("/payment-methods/logo", requireAdmin, methodLogoUpload, uploadPayLogo);
router.post("/payment-methods", requireAdmin, createPayAccount);
router.patch("/payment-methods/:id", requireAdmin, updatePayAccount);
router.delete("/payment-methods/:id", requireAdmin, removePayAccount);



export default router;

