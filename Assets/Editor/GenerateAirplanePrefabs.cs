using System.IO;
using UnityEditor;
using UnityEngine;

namespace EpicPlaneRebuild.EditorTools
{
    /// <summary>
    /// Builds normalized runtime prefabs from the GLB assets imported by glTFast.
    /// Run from Tools > Epic Airplane > Generate Airplane Prefabs after Unity finishes importing.
    /// </summary>
    public static class GenerateAirplanePrefabs
    {
        private sealed class ModelEntry
        {
            public readonly string source;
            public readonly string prefab;
            public readonly float targetSize;

            public ModelEntry(string source, string prefab, float targetSize)
            {
                this.source = source;
                this.prefab = prefab;
                this.targetSize = targetSize;
            }
        }

        private static readonly ModelEntry[] Models =
        {
            new ModelEntry("Assets/Models/GLB/plane_pc.glb", "Assets/Resources/Airplanes/PlayerPlane.prefab", 2.2f),
            new ModelEntry("Assets/Models/GLB/dae_stylized_plane_comet_88.glb", "Assets/Resources/Airplanes/EnemyComet.prefab", 1.5f),
            new ModelEntry("Assets/Models/GLB/stylized_ww1_plane.glb", "Assets/Resources/Airplanes/EnemyWW1.prefab", 1.5f),
            new ModelEntry("Assets/Models/GLB/medium_haul_plane_low_poly.glb", "Assets/Resources/Airplanes/HeavyPlane.prefab", 2.6f),
            new ModelEntry("Assets/Models/GLB/overlordchaoss_plane_as_a.glb", "Assets/Resources/Airplanes/BossPlane.prefab", 3.8f)
        };

        [MenuItem("Tools/Epic Airplane/Generate Airplane Prefabs")]
        public static void Generate()
        {
            Directory.CreateDirectory("Assets/Resources/Airplanes");
            AssetDatabase.Refresh();

            var generated = 0;
            foreach (var entry in Models)
            {
                var source = AssetDatabase.LoadAssetAtPath<GameObject>(entry.source);
                if (source == null)
                {
                    Debug.LogError("[Epic Airplane] GLB model is not imported as a GameObject yet: " + entry.source +
                                   ". Check that glTFast finished importing and review the Console.");
                    continue;
                }

                var root = new GameObject(Path.GetFileNameWithoutExtension(entry.prefab));
                var model = (GameObject)PrefabUtility.InstantiatePrefab(source);
                if (model == null)
                {
                    Object.DestroyImmediate(root);
                    Debug.LogError("[Epic Airplane] Could not instantiate imported model: " + entry.source);
                    continue;
                }

                model.name = source.name;
                model.transform.SetParent(root.transform, false);

                if (!TryGetBounds(root, out var bounds))
                {
                    Object.DestroyImmediate(root);
                    Debug.LogError("[Epic Airplane] No renderers found in model: " + entry.source);
                    continue;
                }

                var largestDimension = Mathf.Max(bounds.size.x, Mathf.Max(bounds.size.y, bounds.size.z));
                if (largestDimension <= 0.0001f)
                {
                    Object.DestroyImmediate(root);
                    Debug.LogError("[Epic Airplane] Model has invalid bounds: " + entry.source);
                    continue;
                }

                model.transform.localScale *= entry.targetSize / largestDimension;
                if (!TryGetBounds(root, out bounds))
                {
                    Object.DestroyImmediate(root);
                    continue;
                }

                var collider = root.AddComponent<BoxCollider>();
                collider.center = root.transform.InverseTransformPoint(bounds.center);
                collider.size = bounds.size;

                var directory = Path.GetDirectoryName(entry.prefab);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                PrefabUtility.SaveAsPrefabAsset(root, entry.prefab);
                Object.DestroyImmediate(root);
                generated++;
                Debug.Log("[Epic Airplane] Generated " + entry.prefab + " from " + entry.source);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[Epic Airplane] Prefab generation finished. Generated " + generated + " of " + Models.Length +
                      " prefabs. Review warnings/errors above before using them.");
        }

        private static bool TryGetBounds(GameObject root, out Bounds bounds)
        {
            var renderers = root.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0)
            {
                bounds = default;
                return false;
            }

            bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++)
                bounds.Encapsulate(renderers[i].bounds);
            return true;
        }
    }
}
