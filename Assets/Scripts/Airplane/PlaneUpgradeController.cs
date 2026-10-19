using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

namespace EpicPlaneRebuild
{
    /// <summary>
    /// Enables airplane parts progressively.
    /// Configure each stage in the Inspector. Earlier stage parts remain enabled.
    /// </summary>
    public sealed class PlaneUpgradeController : MonoBehaviour
    {
        [Serializable]
        public sealed class UpgradeStage
        {
            public string stageName = "Stage";
            [Tooltip("Parts introduced at this stage; these stay enabled at later stages.")]
            public List<GameObject> partsToEnable = new List<GameObject>();
            [Tooltip("Parts to hide once this stage is reached, such as a temporary placeholder.")]
            public List<GameObject> partsToDisableOnReach = new List<GameObject>();
        }

        [SerializeField] private List<UpgradeStage> upgradeStages = new List<UpgradeStage>();
        [SerializeField, Min(0)] private int startingStage;
        [SerializeField] private bool saveStage = true;
        [SerializeField] private string saveKey = "EpicPlane.UpgradeStage";
        [SerializeField] private UnityEvent<int> onStageChanged = new UnityEvent<int>();
        [SerializeField] private UnityEvent onMaxStageReached = new UnityEvent();

        private readonly Dictionary<GameObject, bool> initialActiveStates = new Dictionary<GameObject, bool>();

        public int CurrentStage { get; private set; }
        public int MaxStageIndex => Mathf.Max(0, upgradeStages.Count - 1);
        public bool IsMaxStage => upgradeStages.Count == 0 || CurrentStage >= MaxStageIndex;

        private void Awake()
        {
            CaptureInitialStates();

            if (upgradeStages.Count == 0)
            {
                CurrentStage = 0;
                Debug.LogWarning($"{nameof(PlaneUpgradeController)} on {name} has no stages configured.", this);
                return;
            }

            int saved = saveStage ? PlayerPrefs.GetInt(saveKey, startingStage) : startingStage;
            ApplyStage(Mathf.Clamp(saved, 0, MaxStageIndex), false);
        }

        private void CaptureInitialStates()
        {
            initialActiveStates.Clear();
            foreach (UpgradeStage stage in upgradeStages)
            {
                if (stage == null) continue;
                Capture(stage.partsToEnable);
                Capture(stage.partsToDisableOnReach);
            }
        }

        private void Capture(List<GameObject> objects)
        {
            if (objects == null) return;
            foreach (GameObject item in objects)
                if (item != null && !initialActiveStates.ContainsKey(item))
                    initialActiveStates.Add(item, item.activeSelf);
        }

        public bool Upgrade()
        {
            if (upgradeStages.Count == 0 || IsMaxStage)
            {
                onMaxStageReached.Invoke();
                return false;
            }

            ApplyStage(CurrentStage + 1, true);
            return true;
        }

        public void SetStage(int stageIndex)
        {
            if (upgradeStages.Count == 0) return;
            ApplyStage(Mathf.Clamp(stageIndex, 0, MaxStageIndex), true);
        }

        public void ResetProgress()
        {
            if (saveStage) PlayerPrefs.DeleteKey(saveKey);
            ApplyStage(Mathf.Clamp(startingStage, 0, MaxStageIndex), true);
        }

        private void ApplyStage(int stageIndex, bool notify)
        {
            CurrentStage = stageIndex;

            // Restore the scene's initial state first so moving backwards between
            // stages also restores placeholders that were disabled by later stages.
            foreach (KeyValuePair<GameObject, bool> pair in initialActiveStates)
                if (pair.Key != null) pair.Key.SetActive(pair.Value);

            // Stage parts are controlled by this component and start hidden until reached.
            foreach (UpgradeStage stage in upgradeStages)
            {
                if (stage == null || stage.partsToEnable == null) continue;
                foreach (GameObject part in stage.partsToEnable)
                    if (part != null) part.SetActive(false);
            }

            for (int i = 0; i <= CurrentStage; i++)
            {
                UpgradeStage stage = upgradeStages[i];
                if (stage == null) continue;

                if (stage.partsToEnable != null)
                    foreach (GameObject part in stage.partsToEnable)
                        if (part != null) part.SetActive(true);

                if (stage.partsToDisableOnReach != null)
                    foreach (GameObject part in stage.partsToDisableOnReach)
                        if (part != null) part.SetActive(false);
            }

            if (saveStage)
            {
                PlayerPrefs.SetInt(saveKey, CurrentStage);
                PlayerPrefs.Save();
            }

            if (notify) onStageChanged.Invoke(CurrentStage);
        }
    }
}
