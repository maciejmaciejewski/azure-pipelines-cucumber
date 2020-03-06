
import Controls = require("VSS/Controls");
import TFS_Build_Extension_Contracts = require("TFS/Build/ExtensionContracts");
import TFS_Build_Contracts = require("TFS/Build/Contracts");
import DT_Client = require("TFS/DistributedTask/TaskRestClient");

abstract class BaseReportTab extends Controls.BaseControl {
  protected static readonly ATTACHMENT_TYPE = "cucumber.report";

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
}
class BuildReportTab extends BaseReportTab {
  config: TFS_Build_Extension_Contracts.IBuildResultsViewExtensionConfig = VSS.getConfiguration()
  hubName: string = "build"
  attachmentType: string = "cucumber.report"
  attachmentName: string = "cucumber_report.html"

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

      let protractorAttachment = (await taskClient.getPlanAttachments(projectId, this.hubName, planId, this.attachmentType)).find((attachment) => { return attachment.name === this.attachmentName})

      if (protractorAttachment) {
        this.setTabText('Processing Report File')

        let attachmentContent = await taskClient.getAttachmentContent(projectId, this.hubName, planId, protractorAttachment.timelineId, protractorAttachment.recordId, this.attachmentType, protractorAttachment.name)
        let contentHTML = this.convertBufferToString(attachmentContent)

        this.setFrameHtmlContent(contentHTML)
      } else {
        throw new Error("Report File Not Found")
      }
    } catch (err) {
      const container = this.getElement().get(0);
      const spinner = container.querySelector(".spinner") as HTMLElement;
      const errorBadge = container.querySelector('.error-badge') as HTMLElement;
      if (spinner && errorBadge) {
        spinner.style.display = 'none';
        errorBadge.style.display = 'block';
      }
      this.setTabText('Failed to load Protractor Report')
    }
  }
}

const htmlContainer = document.getElementById("container");
console.log(VSS.getConfiguration())
if (typeof VSS.getConfiguration().onBuildChanged === "function") {
  BuildReportTab.enhance(BuildReportTab, htmlContainer, {});
}

