<?php
require_once 'db.php';
header("Content-Type: application/json");

ini_set('upload_max_filesize', '150M');
ini_set('post_max_size', '600M');
ini_set('max_file_uploads', '50');
ini_set('memory_limit', '1024M');
ini_set('max_execution_time', '600');

// Auto-ensure new columns exist in PostgreSQL so saving never fails on older tables
try {
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS images_json TEXT DEFAULT '[]'");
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(100) DEFAULT 'user'");
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS total_fabric NUMERIC(12, 2) DEFAULT 250.00");
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS overall_balance NUMERIC(12, 2) DEFAULT 250.00");
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS current_season VARCHAR(100) DEFAULT 'December Christmas'");
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS next_season_target VARCHAR(100) DEFAULT 'Ramadhan March'");
    $pdo->exec("ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS is_ordered BOOLEAN DEFAULT FALSE");
} catch (Exception $ignore) {}

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// If User clicks "Order Fabric" on an already Saved Fabric
if (isset($_GET['action']) && $_GET['action'] === 'order_existing' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        $fid = intval($input['fabric_id'] ?? 0);
        $pdo->beginTransaction();

        $upd = $pdo->prepare("UPDATE fabrics SET is_ordered = TRUE WHERE id = :id RETURNING supplier, article_no, total_fabric, current_season");
        $upd->execute([':id' => $fid]);
        $fab = $upd->fetch();

        if ($fab) {
            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (target_role, message, related_fabric_id)
                VALUES ('Designer', :msg, :fid)
            ");
            $notifStmt->execute([
                ':msg' => "📦 Saved Fabric Ordered! Supplier: {$fab['supplier']} | Article: {$fab['article_no']} ({$fab['total_fabric']}m for {$fab['current_season']}). Ready for Designer.",
                ':fid' => $fid
            ]);
        }
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Fabric ordered & Designer notified!"]);
        exit;
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        exit;
    }
}

$uploadedPaths = [];

// 1. Check individual default 3 slots (image1, image2, image3)
foreach (['image1', 'image2', 'image3'] as $slotKey) {
    if (isset($_FILES[$slotKey]) && $_FILES[$slotKey]['error'] === UPLOAD_ERR_OK) {
        $origName = basename($_FILES[$slotKey]['name']);
        $safeName = uniqid('fab_') . '_' . preg_replace("/[^a-zA-Z0-9._-]/", "_", $origName);
        if (move_uploaded_file($_FILES[$slotKey]['tmp_name'], $uploadDir . $safeName)) {
            $uploadedPaths[] = 'uploads/' . $safeName;
        }
    }
}

// 2. Check additional multi-images array (images[])
if (isset($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = is_array($files['name']) ? count($files['name']) : 0;
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $origName = basename($files['name'][$i]);
            $safeName = uniqid('fab_') . '_' . preg_replace("/[^a-zA-Z0-9._-]/", "_", $origName);
            if (move_uploaded_file($files['tmp_name'][$i], $uploadDir . $safeName)) {
                $uploadedPaths[] = 'uploads/' . $safeName;
            }
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $pdo->beginTransaction();

        $supplier        = $_POST['supplier'] ?? '';
        $supplier_no     = $_POST['supplier_no'] ?? '';
        $contain         = $_POST['contain'] ?? '';
        $gsm             = !empty($_POST['gsm']) ? floatval($_POST['gsm']) : 0;
        $article_no      = $_POST['article_no'] ?? '';
        $fabric_category = $_POST['fabric_category'] ?? '';
        $wear_type       = $_POST['wear_type'] ?? '';
        $design_weave    = $_POST['design_weave'] ?? '';
        $fabric_designer = $_POST['fabric_designer'] ?? '';
        $item_family     = $_POST['item_family'] ?? '';
        $color_code      = $_POST['color_code'] ?? '';
        $concept_code    = $_POST['concept_code'] ?? '';
        $width           = $_POST['width'] ?? '';
        $total_fabric    = !empty($_POST['total_fabric']) ? floatval($_POST['total_fabric']) : 250.00;
        $current_season  = $_POST['current_season'] ?? 'December Christmas';
        $next_season     = $_POST['next_season_target'] ?? 'Ramadhan March';
        $action_type     = $_POST['action_type'] ?? 'save';
        $uploaded_by     = $_POST['uploaded_by'] ?? 'user';

        $img1 = $uploadedPaths[0] ?? null;
        $img2 = $uploadedPaths[1] ?? null;
        $img3 = $uploadedPaths[2] ?? null;
        $imagesJson = json_encode($uploadedPaths);

        $stmt = $pdo->prepare("
            INSERT INTO fabrics (
                supplier, supplier_no, contain, gsm, article_no, fabric_category,
                wear_type, design_weave, fabric_designer, item_family, color_code,
                concept_code, width, image1, image2, image3, images_json,
                total_fabric, overall_balance, current_season, next_season_target, is_ordered, uploaded_by
            ) VALUES (
                :supplier, :supplier_no, :contain, :gsm, :article_no, :fabric_category,
                :wear_type, :design_weave, :fabric_designer, :item_family, :color_code,
                :concept_code, :width, :image1, :image2, :image3, :images_json,
                :total_fabric, :overall_balance, :current_season, :next_season, :is_ordered, :uploaded_by
            ) RETURNING id
        ");

        $stmt->execute([
            ':supplier'        => $supplier,
            ':supplier_no'     => $supplier_no,
            ':contain'         => $contain,
            ':gsm'             => $gsm,
            ':article_no'      => $article_no,
            ':fabric_category' => $fabric_category,
            ':wear_type'       => $wear_type,
            ':design_weave'    => $design_weave,
            ':fabric_designer' => $fabric_designer,
            ':item_family'     => $item_family,
            ':color_code'      => $color_code,
            ':concept_code'    => $concept_code,
            ':width'           => $width,
            ':image1'          => $img1,
            ':image2'          => $img2,
            ':image3'          => $img3,
            ':images_json'     => $imagesJson,
            ':total_fabric'    => $total_fabric,
            ':overall_balance' => $total_fabric,
            ':current_season'  => $current_season,
            ':next_season'     => $next_season,
            ':is_ordered'      => ($action_type === 'order') ? 'true' : 'false',
            ':uploaded_by'     => $uploaded_by
        ]);

        $fabricId = $stmt->fetchColumn();

        // Auto-create 5 Sub-Articles (Article A - E)
        $defaultCodes = ['Article A', 'Article B', 'Article C', 'Article D', 'Article E'];
        $perArticleQty = round($total_fabric / 5, 2);

        $artStmt = $pdo->prepare("
            INSERT INTO fabric_articles (fabric_id, article_code, allocated_qty, used_qty, balance_qty)
            VALUES (:fabric_id, :code, :alloc, 0, :alloc)
        ");
        foreach ($defaultCodes as $code) {
            $artStmt->execute([
                ':fabric_id' => $fabricId,
                ':code'      => $code,
                ':alloc'     => $perArticleQty
            ]);
        }

        // Notify Designer when User clicks "Order Fabric"
        if ($action_type === 'order') {
            $imgCount = count($uploadedPaths);
            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (target_role, message, related_fabric_id)
                VALUES ('Designer', :msg, :fid)
            ");
            $notifStmt->execute([
                ':msg' => "📦 New Fabric Ordered by $uploaded_by! Supplier: $supplier | Article: $article_no ($total_fabric m for $current_season, $imgCount images).",
                ':fid' => $fabricId
            ]);
        }

        $pdo->commit();
        echo json_encode([
            "status" => "success",
            "message" => $action_type === 'order'
                ? "Fabric saved & Order Notification sent to Designer!"
                : "Fabric saved! View it below in Saved Fabrics.",
            "fabric_id" => $fabricId
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>