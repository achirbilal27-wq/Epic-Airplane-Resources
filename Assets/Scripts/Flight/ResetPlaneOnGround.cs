using UnityEngine;

namespace EpicPlaneRebuild
{
    /// <summary>
    /// Optional trigger-based reset. Attach to a trigger collider in the landing area.
    /// </summary>
    public sealed class ResetPlaneOnGround : MonoBehaviour
    {
        [SerializeField] private SlingshotLauncher launcher;
        [SerializeField] private string planeTag = "Player";

        private void OnTriggerEnter(Collider other)
        {
            if (launcher == null) return;
            if (string.IsNullOrEmpty(planeTag) || other.CompareTag(planeTag))
                launcher.ResetLaunch();
        }
    }
}
