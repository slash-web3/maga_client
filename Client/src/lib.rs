use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen::Clamped;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, ImageData, window};

#[wasm_bindgen]
pub fn apply_red_filter(canvas_id: &str) {
    let document = window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>().unwrap();
    let context = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    context.set_fill_style(&"rgba(255, 0, 0, 0.5)".into());
    context.fill_rect(0.0, 0.0, canvas.width().into(), canvas.height().into());
}

#[wasm_bindgen]
pub fn apply_yellow_filter(canvas_id: &str) {
    let document = window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>().unwrap();
    let context = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    context.set_fill_style(&"rgba(255, 255, 0, 0.5)".into());
    context.fill_rect(0.0, 0.0, canvas.width().into(), canvas.height().into());
}

#[wasm_bindgen]
pub fn apply_green_filter(canvas_id: &str) {
    let document = window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>().unwrap();
    let context = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    context.set_fill_style(&"rgba(0, 255, 0, 0.5)".into());
    context.fill_rect(0.0, 0.0, canvas.width().into(), canvas.height().into());
}

#[wasm_bindgen]
pub fn apply_blue_filter(canvas_id: &str) {
    let document = window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>().unwrap();
    let context = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    context.set_fill_style(&"rgba(0, 0, 255, 0.5)".into());
    context.fill_rect(0.0, 0.0, canvas.width().into(), canvas.height().into());
}

/*#[wasm_bindgen]
pub fn apply_blur_filter(canvas_id: &str) {
    let document = window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>().unwrap();
    let context = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    context.set_filter("blur(5px)");
    context.draw_image_with_html_canvas_element(&canvas, 0.0, 0.0).unwrap();
    context.set_filter("none"); // Скидання фільтру
}*/

#[wasm_bindgen]
pub fn apply_blur_filter(canvas_id: &str) {
    let radius = 3; // Розмір радіусу розмиття
    let sigma = 1.0; // Стандартне відхилення для Гауссового фільтра
    let size = (radius * 2 + 1) as usize;
    let mut kernel = vec![0.0; size * size];
    let mut kernel_sum = 0.0;

    // Побудова Гауссового ядра
    let mean = radius as f64;
    let two_sigma_square = 2.0 * sigma * sigma;
    let sigma_root = (2.0 * std::f64::consts::PI * sigma * sigma).sqrt();
    
    for y in 0..size {
        for x in 0..size {
            let dx = x as f64 - mean;
            let dy = y as f64 - mean;
            let exponent = -(dx * dx + dy * dy) / two_sigma_square;
            let value = (1.0 / sigma_root) * (-exponent).exp();
            kernel[y * size + x] = value;
            kernel_sum += value;
        }
    }

    // Нормалізація ядра
    for v in kernel.iter_mut() {
        *v /= kernel_sum;
    }

    use web_sys::{ImageData, HtmlCanvasElement, CanvasRenderingContext2d};

    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>().unwrap();
    let context = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    let width = canvas.width() as usize;
    let height = canvas.height() as usize;
    let image_data = context.get_image_data(0.0, 0.0, canvas.width().into(), canvas.height().into()).unwrap();
    let data = image_data.data();
    let mut new_data = data.clone();

    // Гауссове розмиття
    for y in 0..height {
        for x in 0..width {
            let mut sum_r = 0.0;
            let mut sum_g = 0.0;
            let mut sum_b = 0.0;

            for ky in 0..size {
                for kx in 0..size {
                    let source_x = (x as isize + kx as isize - radius as isize).clamp(0, width as isize - 1) as usize;
                    let source_y = (y as isize + ky as isize - radius as isize).clamp(0, height as isize - 1) as usize;
                    let weight = kernel[ky * size + kx];

                    let index = (source_y * width + source_x) * 4;
                    sum_r += data[index] as f64 * weight;
                    sum_g += data[index + 1] as f64 * weight;
                    sum_b += data[index + 2] as f64 * weight;
                }
            }
            let pixel_index = (y * width + x) * 4;
            new_data[pixel_index] = sum_r.clamp(0.0, 255.0) as u8;
            new_data[pixel_index + 1] = sum_g.clamp(0.0, 255.0) as u8;
            new_data[pixel_index + 2] = sum_b.clamp(0.0, 255.0) as u8;
            new_data[pixel_index + 3] = data[pixel_index + 3];
        }
    }

    let new_image_data = ImageData::new_with_u8_clamped_array_and_sh(
        wasm_bindgen::Clamped(&new_data), canvas.width(), canvas.height()
    ).unwrap();

    context.put_image_data(&new_image_data, 0.0, 0.0).unwrap();
}

#[wasm_bindgen]
pub fn save_canvas_snapshot(data_url: &str) {
    let document = web_sys::window().unwrap().document().unwrap();
    
    let a = document.create_element("a").unwrap();
    let a = a.dyn_into::<web_sys::HtmlAnchorElement>().unwrap();
    
    a.set_attribute("href", data_url).unwrap();
    a.set_attribute("download", "snapshot.png").unwrap();
    
    let body = document.body().unwrap();
    body.append_child(&a).unwrap();
    
    let event = web_sys::MouseEvent::new("click").unwrap();
    a.dispatch_event(&event).unwrap();
    
    body.remove_child(&a).unwrap();
}
