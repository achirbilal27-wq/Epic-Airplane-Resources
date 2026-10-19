using UnityEngine;

namespace EpicPlaneRebuild
{
    /// <summary>
    /// Creates a temporary playable scene at runtime so the project can be opened
    /// before real GLB assets and authored scene objects are available.
    /// Replace the primitive airplane with the licensed/imported model later.
    /// </summary>
    public sealed class RuntimePrototypeBootstrap : MonoBehaviour
    {
        private static bool created;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void CreatePrototype()
        {
            if (created || GameObject.Find("EpicPlaneRuntimeRoot") != null) return;
            created = true;
            var root = new GameObject("EpicPlaneRuntimeRoot");
            root.AddComponent<RuntimePrototypeBootstrap>();
        }

        private void Start()
        {
            CreateLighting();
            CreateGround();
            CreateCamera();
            CreatePlane();
        }

        private static void CreateLighting()
        {
            var lightObject = new GameObject("Prototype Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.15f;
            lightObject.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            RenderSettings.ambientLight = new Color(0.55f, 0.58f, 0.64f);
        }

        private static void CreateGround()
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Prototype Ground";
            ground.transform.position = new Vector3(0f, -1.25f, 12f);
            ground.transform.localScale = new Vector3(12f, 1f, 80f);
            SetColor(ground, new Color(0.22f, 0.34f, 0.24f));
        }

        private static void CreatePlane()
        {
            var plane = new GameObject("Prototype Airplane");
            plane.transform.position = Vector3.zero;

            // Generated prefabs are placed in Assets/Resources/Airplanes by the Editor tool.
            // Keep the primitive aircraft as a safe fallback until the prefabs have been generated.
            var importedPlayer = Resources.Load<GameObject>("Airplanes/PlayerPlane");
            if (importedPlayer != null)
            {
                var model = Instantiate(importedPlayer, plane.transform);
                model.name = "Imported Player Airplane";
                model.transform.localPosition = Vector3.zero;
                model.transform.localRotation = Quaternion.identity;
            }
            else
            {
                CreateFallbackPlaneVisual(plane);
            }

            if (plane.GetComponentInChildren<Collider>() == null)
            {
                var collider = plane.AddComponent<BoxCollider>();
                collider.center = Vector3.zero;
                collider.size = new Vector3(2.2f, 0.32f, 1.9f);
            }

            var body = plane.AddComponent<Rigidbody>();
            body.mass = 1.2f;
            body.useGravity = true;
            body.isKinematic = true;
            plane.AddComponent<RuntimePrototypeFlight>();
        }

        private static void CreateFallbackPlaneVisual(GameObject plane)
        {
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Fuselage";
            body.transform.SetParent(plane.transform, false);
            body.transform.localPosition = new Vector3(0f, 0f, 0.05f);
            body.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            body.transform.localScale = new Vector3(0.28f, 0.95f, 0.25f);
            RemoveCollider(body);
            SetColor(body, new Color(0.85f, 0.86f, 0.9f));

            var wing = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wing.name = "Main Wing";
            wing.transform.SetParent(plane.transform, false);
            wing.transform.localPosition = new Vector3(0f, 0.03f, 0.08f);
            wing.transform.localScale = new Vector3(2.2f, 0.09f, 0.48f);
            RemoveCollider(wing);
            SetColor(wing, new Color(0.12f, 0.42f, 0.82f));

            var tail = GameObject.CreatePrimitive(PrimitiveType.Cube);
            tail.name = "Tail Wing";
            tail.transform.SetParent(plane.transform, false);
            tail.transform.localPosition = new Vector3(0f, 0.08f, -0.72f);
            tail.transform.localScale = new Vector3(0.78f, 0.08f, 0.25f);
            RemoveCollider(tail);
            SetColor(tail, new Color(0.12f, 0.42f, 0.82f));

            var fin = GameObject.CreatePrimitive(PrimitiveType.Cube);
            fin.name = "Vertical Stabilizer";
            fin.transform.SetParent(plane.transform, false);
            fin.transform.localPosition = new Vector3(0f, 0.2f, -0.72f);
            fin.transform.localScale = new Vector3(0.09f, 0.32f, 0.28f);
            RemoveCollider(fin);
            SetColor(fin, new Color(0.92f, 0.48f, 0.12f));
        }

        private static void CreateCamera()
        {
            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(0f, 3.8f, -8.5f);
            cameraObject.transform.rotation = Quaternion.Euler(17f, 0f, 0f);
            var camera = cameraObject.AddComponent<Camera>();
            camera.fieldOfView = 58f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.53f, 0.75f, 0.92f);
            cameraObject.AddComponent<AudioListener>();
        }

        private static void RemoveCollider(GameObject target)
        {
            var collider = target.GetComponent<Collider>();
            if (collider != null) Object.Destroy(collider);
        }

        private static void SetColor(GameObject target, Color color)
        {
            var renderer = target.GetComponent<Renderer>();
            if (renderer == null) return;
            var material = new Material(Shader.Find("Standard"));
            material.color = color;
            renderer.material = material;
        }
    }

    public sealed class RuntimePrototypeFlight : MonoBehaviour
    {
        [SerializeField] private float maxPullDistance = 2.4f;
        [SerializeField] private float launchMultiplier = 7.5f;
        [SerializeField] private float resetAfterSeconds = 12f;

        private Rigidbody body;
        private Camera sceneCamera;
        private Vector3 startPosition;
        private Quaternion startRotation;
        private Plane dragPlane;
        private Vector3 dragPosition;
        private bool dragging;
        private bool launched;
        private float launchedAt;

        private void Awake()
        {
            body = GetComponent<Rigidbody>();
            sceneCamera = Camera.main;
            startPosition = transform.position;
            startRotation = transform.rotation;
        }

        private void OnMouseDown()
        {
            if (launched || sceneCamera == null || body == null) return;
            dragPlane = new Plane(Vector3.forward, startPosition);
            if (!GetWorldPoint(Input.mousePosition, out dragPosition)) return;
            dragging = true;
            body.isKinematic = true;
        }

        private void OnMouseDrag()
        {
            if (!dragging || launched || !GetWorldPoint(Input.mousePosition, out var point)) return;
            var offset = Vector3.ClampMagnitude(point - startPosition, maxPullDistance);
            transform.position = startPosition + offset;
        }

        private void OnMouseUp()
        {
            if (!dragging || launched || body == null) return;
            dragging = false;
            var pull = startPosition - transform.position;
            body.isKinematic = false;
            body.velocity = Vector3.zero;
            body.angularVelocity = Vector3.zero;
            body.AddForce((pull + Vector3.forward * 0.7f) * launchMultiplier, ForceMode.VelocityChange);
            launched = true;
            launchedAt = Time.time;
        }

        private bool GetWorldPoint(Vector3 screen, out Vector3 point)
        {
            point = transform.position;
            if (sceneCamera == null) return false;
            var ray = sceneCamera.ScreenPointToRay(screen);
            if (!dragPlane.Raycast(ray, out var enter)) return false;
            point = ray.GetPoint(enter);
            return true;
        }

        private void Update()
        {
            if (launched && (transform.position.y < -4f || Time.time - launchedAt > resetAfterSeconds))
                ResetPlane();
        }

        private void OnGUI()
        {
            GUI.Label(new Rect(16, 16, Screen.width - 32, 30), "EPIC AIRPLANE — Prototype");
            GUI.Label(new Rect(16, 44, Screen.width - 32, 30), launched ? "Flying... auto-reset in a moment" : "Drag the airplane backward, then release to launch");
            if (GUI.Button(new Rect(16, Screen.height - 68, 150, 48), "Reset airplane"))
                ResetPlane();
        }

        private void ResetPlane()
        {
            if (body == null) return;
            body.velocity = Vector3.zero;
            body.angularVelocity = Vector3.zero;
            body.isKinematic = true;
            transform.position = startPosition;
            transform.rotation = startRotation;
            launched = false;
            dragging = false;
        }
    }
}
