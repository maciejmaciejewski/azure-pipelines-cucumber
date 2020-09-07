
import Controls = require("VSS/Controls");
import TFS_Build_Extension_Contracts = require("TFS/Build/ExtensionContracts");
import TFS_Build_Contracts = require("TFS/Build/Contracts");
import DT_Client = require("TFS/DistributedTask/TaskRestClient");
import RM_Client = require("ReleaseManagement/Core/RestClient");
import TFS_Release_Contracts = require("ReleaseManagement/Core/Contracts");

abstract class BaseReportTab extends Controls.BaseControl {
  protected readonly ATTACHMENT_TYPE: string = "cucumber.report";
  protected readonly ATTACHMENT_NAME: string = "cucumber_report.html"
  protected readonly SCREENSHOT_TYPE: string = "cucumber.screenshot"
  protected readonly TASK_ID: string = '83c082c0-5032-11ea-8fab-bbe0f0fcf287'

  protected constructor() {
    super();
  }

  protected convertBufferToString(buffer: ArrayBuffer): string {
    const enc = new TextDecoder("utf-8");
    const arr = new Uint8Array(buffer);
    return enc.decode(arr);
  }

  protected setFrameHtmlContent(htmlStr: string) {
    const htmlContainer = this.getElement().get(0);
    const frame = htmlContainer.querySelector("#cucumber-result") as HTMLIFrameElement;
    const waiting = htmlContainer.querySelector("#waiting") as HTMLElement;

    if (htmlStr && frame && waiting) {
      frame.srcdoc = htmlStr;
      waiting.style.display = "none";
      frame.style.display = "block";
    }
  }

  protected setTabText (message: string) {
    const htmlContainer = this.getElement().get(0)
    htmlContainer.querySelector("#waiting p").innerHTML = message
  }

  protected setErrorText (error: string, message: string) {
    console.log(error)
    const container = this.getElement().get(0);
    const spinner = container.querySelector(".spinner") as HTMLElement;
    const errorBadge = container.querySelector('.error-badge') as HTMLElement;
    if (spinner && errorBadge) {
      spinner.style.display = 'none';
      errorBadge.style.display = 'block';
    }

    this.setTabText(message)
  }

  protected sanitizeImageLinks(reportText: string, screenshotList) {
    this.setTabText('Sanitizing Image Links')
    screenshotList.forEach(screenshot => {
      console.log(screenshot)
      // Handle Windows paths`
      let windowsPath = `screenshots\\\\${screenshot.name}`
      let windowsRegExp = new RegExp(windowsPath, 'gi')
      reportText = reportText.replace(windowsRegExp, screenshot._links.self.href)

      // Handle Unix paths
      let unixPath = `screenshots/${screenshot.name}`
      let unixRegExp = new RegExp(unixPath, 'gi')
      reportText = reportText.replace(unixRegExp, screenshot._links.self.href)
    })

    return reportText
  }
}
class BuildReportTab extends BaseReportTab {
  config: TFS_Build_Extension_Contracts.IBuildResultsViewExtensionConfig = VSS.getConfiguration()
  hubName: string = "build"

  constructor() {
    super()
  }

  public initialize(): void {
    super.initialize();

    this.config.onBuildChanged((build: TFS_Build_Contracts.Build) => {
      this.findAttachment(build)
    })
  }

  private async findAttachment(build: TFS_Build_Contracts.Build)  {
    try {
      this.setTabText('Looking for Report File')
      const vsoContext: WebContext = VSS.getWebContext();
      let taskClient: DT_Client.TaskHttpClient = DT_Client.getClient();

      const projectId = vsoContext.project.id;
      const planId = build.orchestrationPlan.planId;

      let cucumberReport = (await taskClient.getPlanAttachments(
        projectId,
        this.hubName,
        planId,
        this.ATTACHMENT_TYPE
        ))[0]

      if (cucumberReport) {
        this.setTabText('Processing Report File')

        const attachmentContent = await taskClient.getAttachmentContent(projectId, this.hubName, planId, cucumberReport.timelineId, cucumberReport.recordId, this.ATTACHMENT_TYPE, cucumberReport.name)
        let htmlContent = this.convertBufferToString(attachmentContent)
        this.setTabText('Looking for screenshots')
        let screenshots = await taskClient.getPlanAttachments(projectId, this.hubName, planId, this.SCREENSHOT_TYPE)

        let finalReport = this.sanitizeImageLinks(htmlContent, screenshots)
        this.setTabText('Publishing Report')
        this.setFrameHtmlContent(finalReport)
      } else {
        throw new Error("Report File Not Found")
      }
    } catch (error) {
      this.setErrorText(error, 'Unable to load Cucumber Report')
    }
  }
}

class ReleaseReportTab extends BaseReportTab {
  environment: TFS_Release_Contracts.ReleaseEnvironment

  constructor() {
    super();
  }

  public initialize(): void {
    super.initialize();
    this.environment = VSS.getConfiguration().releaseEnvironment
    this.findfindAttachment(this.environment.releaseId, this.environment.id)
  }

  private async findfindAttachment(releaseId, environmentId) {
    const vsoContext: WebContext = VSS.getWebContext();
    const rmClient = RM_Client.getClient() as RM_Client.ReleaseHttpClient;
    const release = await rmClient.getRelease(vsoContext.project.id, releaseId);
    const env = release.environments.filter((e) => e.id === environmentId)[0];

    this.setTabText('Looking for Report File')

    try {
      if (!(env.deploySteps && env.deploySteps.length)) {
        throw new Error("This release has not been deployed yet");
      }

      const deployStep = env.deploySteps[env.deploySteps.length - 1];
      if (!(deployStep.releaseDeployPhases && deployStep.releaseDeployPhases.length)) {
        throw new Error("This release has no job");
      }

      const runPlanIds = deployStep.releaseDeployPhases.map((phase) => phase.runPlanId);
      var runPlanId = null;
      if (!runPlanIds.length) {
        throw new Error("There are no plan IDs");
      } else {
        searchForRunPlanId: {
          for (const phase of deployStep.releaseDeployPhases) {
            for (const deploymentJob of phase.deploymentJobs){
              for (const task of deploymentJob.tasks){
                // TODO: Check if works on all browsers
                if (task.task?.id === '83c082c0-5032-11ea-8fab-bbe0f0fcf287'){
                  runPlanId = phase.runPlanId;
                  break searchForRunPlanId;
                }
              }
            }
          }
        }
      }

      const attachments = await rmClient.getTaskAttachments(
        vsoContext.project.id,
        env.releaseId,
        env.id,
        deployStep.attempt,
        runPlanId,
        this.ATTACHMENT_TYPE
      );

      if (attachments.length === 0) {
        throw new Error("There is no HTML result attachment");
      }

      let cucumberReport = attachments[0]

      if (cucumberReport) {
        this.setTabText('Processing Report File')

        const attachmentContent = await rmClient.getTaskAttachmentContent(
          vsoContext.project.id,
          env.releaseId,
          env.id,
          deployStep.attempt,
          runPlanId,
          cucumberReport.recordId,
          this.ATTACHMENT_TYPE,
          cucumberReport.name,
        );
        const htmlContent = this.convertBufferToString(attachmentContent)

        this.setTabText('Looking for screenshots')
        const screenshots = await rmClient.getTaskAttachments(
          vsoContext.project.id,
          env.releaseId,
          env.id,
          deployStep.attempt,
          runPlanId,
          this.SCREENSHOT_TYPE
        );

        const finalReport = this.sanitizeImageLinks(htmlContent, screenshots)
        this.setTabText('Publishing Report')
        this.setFrameHtmlContent(finalReport)
      }


    } catch (error) {
      this.setErrorText(error, 'Unable to load Cucumber Report')
    }
  }
}

const htmlContainer = document.getElementById("container");
console.log(VSS.getConfiguration())
if (typeof VSS.getConfiguration().onBuildChanged === "function") {
  BuildReportTab.enhance(BuildReportTab, htmlContainer, {});
} else if (typeof VSS.getConfiguration().releaseEnvironment === "object") {
  ReleaseReportTab.enhance(ReleaseReportTab, htmlContainer, {});
}
