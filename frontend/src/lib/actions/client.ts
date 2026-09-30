/**
* Client-side entry points for server actions: unwrap ActionResult and throw a real Error
* (with the API's message) so components can keep using try/catch + toast.
*/
import type { ActionResult } from "@/lib/actions/result";
import { createPersonAction as createPersonActionRaw, updatePersonAction as updatePersonActionRaw, createCompanyAction as createCompanyActionRaw, previewAction as previewActionRaw, generateAction as generateActionRaw, approveAction as approveActionRaw, voidAction as voidActionRaw, sendSignatureAction as sendSignatureActionRaw, getSigningLinkAction as getSigningLinkActionRaw, revokeSigningLinkAction as revokeSigningLinkActionRaw, extendSigningLinkAction as extendSigningLinkActionRaw, countersignAction as countersignActionRaw, recommendAction as recommendActionRaw, saveCompanySettingsAction as saveCompanySettingsActionRaw, saveWorkspaceSettingsAction as saveWorkspaceSettingsActionRaw, uploadBrandingAssetAction as uploadBrandingAssetActionRaw, saveAiSettingsAction as saveAiSettingsActionRaw, saveSigningSettingsAction as saveSigningSettingsActionRaw, saveEmailSettingsAction as saveEmailSettingsActionRaw, saveSecuritySettingsAction as saveSecuritySettingsActionRaw, sendTestEmailAction as sendTestEmailActionRaw, getDocumentSyncStateAction as getDocumentSyncStateActionRaw, updateDocumentThemeAction as updateDocumentThemeActionRaw, recommendDocumentThemeAction as recommendDocumentThemeActionRaw, getDashboardInsightsAction as getDashboardInsightsActionRaw } from "@/lib/actions/workspace";
import { openSigningAction as openSigningActionRaw, consentSigningAction as consentSigningActionRaw, sendSigningOtpAction as sendSigningOtpActionRaw, verifySigningOtpAction as verifySigningOtpActionRaw, recipientSignAction as recipientSignActionRaw } from "@/lib/actions/signing";
import { createOrgUserAction as createOrgUserActionRaw, updateOrgUserAction as updateOrgUserActionRaw } from "@/lib/actions/users";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export const createPersonAction = async (...args: Parameters<typeof createPersonActionRaw>) => unwrap(await createPersonActionRaw(...args));
export const updatePersonAction = async (...args: Parameters<typeof updatePersonActionRaw>) => unwrap(await updatePersonActionRaw(...args));
export const createCompanyAction = async (...args: Parameters<typeof createCompanyActionRaw>) => unwrap(await createCompanyActionRaw(...args));
export const previewAction = async (...args: Parameters<typeof previewActionRaw>) => unwrap(await previewActionRaw(...args));
export const generateAction = async (...args: Parameters<typeof generateActionRaw>) => unwrap(await generateActionRaw(...args));
export const approveAction = async (...args: Parameters<typeof approveActionRaw>) => unwrap(await approveActionRaw(...args));
export const voidAction = async (...args: Parameters<typeof voidActionRaw>) => unwrap(await voidActionRaw(...args));
export const sendSignatureAction = async (...args: Parameters<typeof sendSignatureActionRaw>) => unwrap(await sendSignatureActionRaw(...args));
export const getSigningLinkAction = async (...args: Parameters<typeof getSigningLinkActionRaw>) => unwrap(await getSigningLinkActionRaw(...args));
export const revokeSigningLinkAction = async (...args: Parameters<typeof revokeSigningLinkActionRaw>) => unwrap(await revokeSigningLinkActionRaw(...args));
export const extendSigningLinkAction = async (...args: Parameters<typeof extendSigningLinkActionRaw>) => unwrap(await extendSigningLinkActionRaw(...args));
export const countersignAction = async (...args: Parameters<typeof countersignActionRaw>) => unwrap(await countersignActionRaw(...args));
export const recommendAction = async (...args: Parameters<typeof recommendActionRaw>) => unwrap(await recommendActionRaw(...args));
export const saveCompanySettingsAction = async (...args: Parameters<typeof saveCompanySettingsActionRaw>) => unwrap(await saveCompanySettingsActionRaw(...args));
export const saveWorkspaceSettingsAction = async (...args: Parameters<typeof saveWorkspaceSettingsActionRaw>) => unwrap(await saveWorkspaceSettingsActionRaw(...args));
export const uploadBrandingAssetAction = async (...args: Parameters<typeof uploadBrandingAssetActionRaw>) => unwrap(await uploadBrandingAssetActionRaw(...args));
export const saveAiSettingsAction = async (...args: Parameters<typeof saveAiSettingsActionRaw>) => unwrap(await saveAiSettingsActionRaw(...args));
export const saveSigningSettingsAction = async (...args: Parameters<typeof saveSigningSettingsActionRaw>) => unwrap(await saveSigningSettingsActionRaw(...args));
export const saveEmailSettingsAction = async (...args: Parameters<typeof saveEmailSettingsActionRaw>) => unwrap(await saveEmailSettingsActionRaw(...args));
export const saveSecuritySettingsAction = async (...args: Parameters<typeof saveSecuritySettingsActionRaw>) => unwrap(await saveSecuritySettingsActionRaw(...args));
export const sendTestEmailAction = async (...args: Parameters<typeof sendTestEmailActionRaw>) => unwrap(await sendTestEmailActionRaw(...args));
export const getDocumentSyncStateAction = async (...args: Parameters<typeof getDocumentSyncStateActionRaw>) => unwrap(await getDocumentSyncStateActionRaw(...args));
export const updateDocumentThemeAction = async (...args: Parameters<typeof updateDocumentThemeActionRaw>) => unwrap(await updateDocumentThemeActionRaw(...args));
export const recommendDocumentThemeAction = async (...args: Parameters<typeof recommendDocumentThemeActionRaw>) => unwrap(await recommendDocumentThemeActionRaw(...args));
export const getDashboardInsightsAction = async (...args: Parameters<typeof getDashboardInsightsActionRaw>) => unwrap(await getDashboardInsightsActionRaw(...args));
export const openSigningAction = async (...args: Parameters<typeof openSigningActionRaw>) => unwrap(await openSigningActionRaw(...args));
export const consentSigningAction = async (...args: Parameters<typeof consentSigningActionRaw>) => unwrap(await consentSigningActionRaw(...args));
export const sendSigningOtpAction = async (...args: Parameters<typeof sendSigningOtpActionRaw>) => unwrap(await sendSigningOtpActionRaw(...args));
export const verifySigningOtpAction = async (...args: Parameters<typeof verifySigningOtpActionRaw>) => unwrap(await verifySigningOtpActionRaw(...args));
export const recipientSignAction = async (...args: Parameters<typeof recipientSignActionRaw>) => unwrap(await recipientSignActionRaw(...args));
export const createOrgUserAction = async (...args: Parameters<typeof createOrgUserActionRaw>) => unwrap(await createOrgUserActionRaw(...args));
export const updateOrgUserAction = async (...args: Parameters<typeof updateOrgUserActionRaw>) => unwrap(await updateOrgUserActionRaw(...args));
