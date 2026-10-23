<?php
require_once 'db.php';
header("Content-Type: application/json");

try {
    $where = [];
    $params = [];

    if (!empty($_GET['fabric_category'])) {
        $where[] = "LOWER(fabric_category) LIKE LOWER(:cat)";
        $params[':cat'] = '%' . $_GET['fabric_category'] . '%';
    }
    if (!empty($_GET['wear_type'])) {
        $where[] = "LOWER(wear_type) LIKE LOWER(:wear)";
        $params[':wear'] = '%' . $_GET['wear_type'] . '%';
    }
    if (!empty($_GET['gsm'])) {
        $where[] = "CAST(gsm AS TEXT) LIKE :gsm";
        $params[':gsm'] = '%' . $_GET['gsm'] . '%';
    }
    if (!empty($_GET['color_code'])) {
        $where[] = "LOWER(color_code) LIKE LOWER(:color)";
        $params[':color'] = '%' . $_GET['color_code'] . '%';
    }
    if (!empty($_GET['contain'])) {
        $where[] = "LOWER(contain) LIKE LOWER(:contain)";
        $params[':contain'] = '%' . $_GET['contain'] . '%';
    }

    $sql = "SELECT * FROM fabrics";
    if (count($where) > 0) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $fabrics = $stmt->fetchAll();

    $artStmt = $pdo->prepare("SELECT * FROM fabric_articles WHERE fabric_id = :fid ORDER BY id ASC");
    foreach ($fabrics as &$fab) {
        $artStmt->execute([':fid' => $fab['id']]);
        $fab['articles'] = $artStmt->fetchAll();

        $decoded = !empty($fab['images_json']) ? json_decode($fab['images_json'], true) : [];
        if (!is_array($decoded) || count($decoded) === 0) {
            $decoded = array_values(array_filter([$fab['image1'], $fab['image2'], $fab['image3']]));
        }
        $fab['images_list'] = $decoded;
    }

    echo json_encode(["status" => "success", "data" => $fabrics]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>