using UnityEngine;
using UnityEngine.Events;

namespace EpicPlaneRebuild
{
    /// <summary>
    /// Prototype drag-to-launch controller for a Rigidbody airplane.
    /// Tune forces and references after adding the actual scene assets.
    /// </summary>
    public sealed class SlingshotLauncher : MonoBehaviour
    {
        [Header("Plane")]
        [SerializeField] private Transform launchPlane;
        [SerializeField] private Rigidbody planeRigidbody;
        [SerializeField] private Collider planeBody;
        [SerializeField] private Transform cameraTransform;

        [Header("Slingshot")]
        [SerializeField] private Transform anchorLeft;
        [SerializeField] private Transform anchorRight;
        [SerializeField] private LineRenderer leftBand;
        [SerializeField] private LineRenderer rightBand;
        [SerializeField, Min(0.1f)] private float maxPullDistance = 2.5f;
        [SerializeField, Min(0f)] private float launchForce = 12f;
        [SerializeField] private LayerMask planeSelectionMask = ~0;

        [Header("Events")]
        [SerializeField] private UnityEvent onLaunch = new UnityEvent();

        private bool isDragging;
        private bool hasLaunched;
        private Vector3 initialPlanePosition;
        private Quaternion initialPlaneRotation;
        private Plane dragPlane;

        private void Awake()
        {
            if (launchPlane != null)
            {
                initialPlanePosition = launchPlane.position;
                initialPlaneRotation = launchPlane.rotation;
            }

            if (cameraTransform == null && Camera.main != null)
                cameraTransform = Camera.main.transform;

            if (planeRigidbody == null && launchPlane != null)
                planeRigidbody = launchPlane.GetComponent<Rigidbody>();
        }

        private void Start()
        {
            if (launchPlane != null) SetBandPositions(launchPlane.position);
            SetBandsVisible(true);
        }

        private void Update()
        {
            if (launchPlane == null || planeRigidbody == null || hasLaunched) return;

            if (Input.GetMouseButtonDown(0))
            {
                Camera cam = Camera.main;
                if (cam == null) return;

                Ray ray = cam.ScreenPointToRay(Input.mousePosition);
                bool hitPlane = planeBody != null
                    ? planeBody.Raycast(ray, out _, 1000f)
                    : Physics.Raycast(ray, out RaycastHit hit, 1000f, planeSelectionMask)
                      && hit.transform.IsChildOf(launchPlane);

                if (!hitPlane) return;

                Vector3 planeNormal = cameraTransform != null
                    ? cameraTransform.forward
                    : Vector3.forward;

                dragPlane = new Plane(planeNormal, initialPlanePosition);
                isDragging = true;
                planeRigidbody.isKinematic = true;
            }

            if (isDragging && Input.GetMouseButton(0) && TryGetDragPoint(Input.mousePosition, out Vector3 point))
            {
                Vector3 offset = Vector3.ClampMagnitude(point - initialPlanePosition, maxPullDistance);
                launchPlane.position = initialPlanePosition + offset;
                SetBandPositions(launchPlane.position);
            }

            if (isDragging && Input.GetMouseButtonUp(0))
            {
                isDragging = false;
                Vector3 pull = initialPlanePosition - launchPlane.position;
                planeRigidbody.isKinematic = false;
                planeRigidbody.velocity = Vector3.zero;
                planeRigidbody.angularVelocity = Vector3.zero;
                planeRigidbody.AddForce(pull * launchForce, ForceMode.VelocityChange);
                hasLaunched = true;
                SetBandsVisible(false);
                onLaunch.Invoke();
            }
        }

        private bool TryGetDragPoint(Vector3 screenPosition, out Vector3 point)
        {
            point = launchPlane != null ? launchPlane.position : transform.position;
            Camera cam = Camera.main;
            if (cam == null) return false;

            Ray ray = cam.ScreenPointToRay(screenPosition);
            if (!dragPlane.Raycast(ray, out float enter)) return false;
            point = ray.GetPoint(enter);
            return true;
        }

        private void SetBandPositions(Vector3 planePosition)
        {
            if (leftBand != null && anchorLeft != null)
            {
                leftBand.positionCount = 2;
                leftBand.SetPosition(0, anchorLeft.position);
                leftBand.SetPosition(1, planePosition);
            }

            if (rightBand != null && anchorRight != null)
            {
                rightBand.positionCount = 2;
                rightBand.SetPosition(0, anchorRight.position);
                rightBand.SetPosition(1, planePosition);
            }
        }

        private void SetBandsVisible(bool visible)
        {
            if (leftBand != null) leftBand.enabled = visible;
            if (rightBand != null) rightBand.enabled = visible;
        }

        public void ResetLaunch()
        {
            if (launchPlane == null || planeRigidbody == null) return;

            planeRigidbody.velocity = Vector3.zero;
            planeRigidbody.angularVelocity = Vector3.zero;
            planeRigidbody.isKinematic = true;
            launchPlane.position = initialPlanePosition;
            launchPlane.rotation = initialPlaneRotation;
            hasLaunched = false;
            isDragging = false;
            SetBandPositions(launchPlane.position);
            SetBandsVisible(true);
        }
    }
}
