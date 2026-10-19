using UnityEngine;

namespace EpicPlaneRebuild
{
    /// <summary>
    /// Inspector reminder for the manual scene setup; does not generate a scene.
    /// </summary>
    public sealed class SceneSetupChecklist : MonoBehaviour
    {
        [TextArea(5, 12)]
        public string checklist =
            "1. Create PlaneRoot with Rigidbody and suitable colliders.\n" +
            "2. Add the egg-like base mesh as the first visible stage.\n" +
            "3. Assign wing, propeller and tail parts to later upgrade stages.\n" +
            "4. Configure two LineRenderers for the elastic bands.\n" +
            "5. Assign the camera, anchors, plane references and selection mask.\n" +
            "6. Connect the upgrade UI button to PlaneUpgradeController.Upgrade().\n" +
            "7. Save a scene under Assets/Scenes and add it to Build Settings.";
    }
}
